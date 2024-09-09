
import { SaveProps } from "./app";
import { type SaveVisualizationProps, runSaveLensVisualization } from './save_modal_container'; import { defaultDoc, makeDefaultServices } from "../mocks";
import faker from 'faker';
import { createEmbeddableStateTransferMock } from "@kbn/embeddable-plugin/public/mocks";
import { EmbeddableStateTransfer } from "@kbn/embeddable-plugin/public";
import { makeAttributeService } from "../mocks/services_mock";

jest.mock('../persistence/saved_objects_utils/check_for_duplicate_title', () => ({
    checkForDuplicateTitle: jest.fn(async () => false),
}));

function createStateTransferMock(
    propOverrides: Partial<EmbeddableStateTransfer> = {}
): EmbeddableStateTransfer {
    const stateTransferMock = createEmbeddableStateTransferMock();
    return { ...stateTransferMock, ...propOverrides } as EmbeddableStateTransfer;
}

describe('runSaveLensVisualization', () => {

    function getDefaultArgs(
        servicesOverrides: Partial<SaveVisualizationProps> = {},
        { saveToLibrary, ...propsOverrides }: Partial<SaveProps & { saveToLibrary: boolean }> = {}
    ) {

        // Need to call reset here as makeDefaultServices() reuses some mocks from core
        jest.resetAllMocks();
        const redirectToOrigin = jest.fn();
        const onAppLeave = jest.fn();
        const stateTransferMock = createStateTransferMock({ navigateToWithEmbeddablePackage: jest.fn() })
        const props: SaveVisualizationProps = {
            ...makeDefaultServices(),
            // start with both the initial input and lastKnownDoc synced
            lastKnownDoc: defaultDoc,
            initialInput: { attributes: defaultDoc, savedObjectId: defaultDoc.savedObjectId },
            redirectToOrigin,
            onAppLeave,
            stateTransfer: stateTransferMock,
            ...servicesOverrides
        };
        const saveProps: SaveProps = {
            newTitle: faker.lorem.word(),
            newDescription: faker.lorem.sentence(),
            newTags: [faker.lorem.word(), faker.lorem.word()],
            isTitleDuplicateConfirmed: false,
            returnToOrigin: false,
            dashboardId: undefined,
            newCopyOnSave: false,
            ...propsOverrides
        };
        const options = {
            saveToLibrary: Boolean(saveToLibrary)
        }

        return {
            props,
            saveProps,
            options,
            // convenience shortcuts
            /**
             * This function will be called when a fresh chart is saved
             * and in the modal the user chooses to add the chart into a specific dashboard. Make sure to pass the "dashboardId" prop as well to simulate this scenario.
             *  This is used to test indirectly the redirectToDashboard call
             */
            redirectToDashboardFn: props.stateTransfer.navigateToWithEmbeddablePackage,
            saveToLibraryFn: props.attributeService.saveToLibrary,
            toasts: props.notifications.toasts
        }
    }

    describe('from dashboard', () => {
        describe('as by value', () => {

            const defaultByValueDoc = { ...defaultDoc, savedObjectId: undefined };

            describe('Save and return', () => {

                // Test the "Save and return" button
                it("should get back to dashboard", async () => {
                    const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn } = getDefaultArgs(
                        {
                            lastKnownDoc: defaultByValueDoc,
                            initialInput: { attributes: defaultByValueDoc },
                        },
                        { returnToOrigin: true }
                    );
                    await runSaveLensVisualization(props, saveProps, options);
                    expect(props.onAppLeave).toHaveBeenCalled();
                    expect(props.redirectToOrigin).toHaveBeenCalled();
                    expect(redirectToDashboardFn).not.toHaveBeenCalled();
                    expect(saveToLibraryFn).not.toHaveBeenCalled();
                    expect(props.notifications.toasts.addSuccess).not.toHaveBeenCalled();
                });
            });

            describe('Save to library', () => {

                // Test the "Save to library" flow
                it('should save to library without redirect', async () => {
                    const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn } = getDefaultArgs(
                        {

                            lastKnownDoc: defaultByValueDoc,
                            initialInput: { attributes: defaultByValueDoc }
                        },
                        {
                            saveToLibrary: true,
                            // do not get back at dashboard once saved
                            returnToOrigin: false
                        }
                    );
                    await runSaveLensVisualization(props, saveProps, options);

                    expect(props.onAppLeave).not.toHaveBeenCalled();
                    expect(props.redirectToOrigin).not.toHaveBeenCalled();
                    expect(redirectToDashboardFn).not.toHaveBeenCalled();
                    expect(saveToLibraryFn).toHaveBeenCalled();
                    expect(props.notifications.toasts.addSuccess).toHaveBeenCalled();
                });

                it('should save to library and redirect', async () => {
                    const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn } = getDefaultArgs(
                        {
                            lastKnownDoc: defaultByValueDoc,
                            initialInput: { attributes: defaultByValueDoc }
                        },
                        {
                            saveToLibrary: true,
                            // return to dashboard once saved
                            returnToOrigin: true
                        }
                    );
                    await runSaveLensVisualization(props, saveProps, options);

                    expect(props.onAppLeave).toHaveBeenCalled();
                    expect(props.redirectToOrigin).toHaveBeenCalled();
                    expect(redirectToDashboardFn).not.toHaveBeenCalled();
                    expect(saveToLibraryFn).toHaveBeenCalled();
                    expect(props.notifications.toasts.addSuccess).not.toHaveBeenCalled();
                });
            });
        });

        describe('as by reference', () => {
            // There are 4 possibilities here:
            // save the current document overwriting the existing one
            it("should overwrite and show a success toast", async () => {
                const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn, toasts } = getDefaultArgs(
                    {
                        // defaultDoc is by reference
                    },
                    { newCopyOnSave: false, saveToLibrary: true }
                );
                await runSaveLensVisualization(props, saveProps, options);

                expect(props.onAppLeave).not.toHaveBeenCalled();
                expect(props.redirectToOrigin).not.toHaveBeenCalled();
                expect(redirectToDashboardFn).not.toHaveBeenCalled();
                expect(saveToLibraryFn).toHaveBeenCalledWith(expect.anything(), expect.anything(), defaultDoc.savedObjectId);
                expect(toasts.addSuccess).toHaveBeenCalled();
            });

            // save the current document as a new by-ref copy in the library
            it("should save as a new copy and show a success toast", async () => {
                const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn, toasts } = getDefaultArgs(
                    {
                        // defaultDoc is by reference
                    },
                    { newCopyOnSave: true, saveToLibrary: true }
                );
                await runSaveLensVisualization(props, saveProps, options);

                expect(props.onAppLeave).not.toHaveBeenCalled();
                expect(props.redirectToOrigin).not.toHaveBeenCalled();
                expect(redirectToDashboardFn).not.toHaveBeenCalled();
                expect(saveToLibraryFn).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined);
                expect(toasts.addSuccess).toHaveBeenCalled();
            });
            // save the current document as a new by-value copy and add it to a dashboard
            it("should save as a new by-value copy and redirect to the dashboard", async () => {
                const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn, toasts } = getDefaultArgs(
                    {
                        // defaultDoc is by reference
                    },
                    { newCopyOnSave: true, saveToLibrary: false, dashboardId: faker.random.uuid() }
                );
                await runSaveLensVisualization(props, saveProps, options);

                expect(props.onAppLeave).not.toHaveBeenCalled();
                expect(props.redirectToOrigin).not.toHaveBeenCalled();
                expect(redirectToDashboardFn).toHaveBeenCalled();
                expect(saveToLibraryFn).not.toHaveBeenCalled();
                expect(toasts.addSuccess).toHaveBeenCalled();
            });
            // save the current document as a new by-ref copy and add it to a dashboard
            it("should save as a new by-ref copy and redirect to the dashboard", async () => {
                const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn, toasts } = getDefaultArgs(
                    {
                        // defaultDoc is by reference
                    },
                    { newCopyOnSave: true, saveToLibrary: true, dashboardId: faker.random.uuid() }
                );
                await runSaveLensVisualization(props, saveProps, options);

                expect(props.onAppLeave).not.toHaveBeenCalled();
                expect(props.redirectToOrigin).not.toHaveBeenCalled();
                expect(redirectToDashboardFn).toHaveBeenCalled();
                expect(saveToLibraryFn).toHaveBeenCalled();
                expect(toasts.addSuccess).toHaveBeenCalled();
            });


        });
    });

    describe('fresh editor start', () => {
        it("should reload the editor if it has been saved as new copy", async () => {
            const { props, saveProps, options, saveToLibraryFn, toasts } = getDefaultArgs(
                {
                }, {
                saveToLibrary: true,
                newCopyOnSave: true
            }
            );
            await runSaveLensVisualization(props, saveProps, options);
            expect(props.stateTransfer.clearEditorState).toHaveBeenCalled();
            expect(props.redirectTo).toHaveBeenCalledWith(defaultDoc.savedObjectId);
            expect(saveToLibraryFn).toHaveBeenCalled();
            expect(toasts.addSuccess).not.toHaveBeenCalled();
        });


        it('should show a notification toast and not reload as first save of the document', async () => {
            const { props, saveProps, options, saveToLibraryFn, toasts } = getDefaultArgs(
                { lastKnownDoc: { ...defaultDoc, savedObjectId: undefined }, persistedDoc: undefined },
            );
            await runSaveLensVisualization(props, saveProps, options);
            expect(toasts.addSuccess).toHaveBeenCalled();
            expect(props.application.navigateToApp).not.toHaveBeenCalledWith('lens', { path: '/' });
            expect(saveToLibraryFn).toHaveBeenCalled();
            expect(props.redirectTo).not.toHaveBeenCalled();
        });

        it("should throw if something goes wrong when saving", async () => {
            const attributeServiceMock = { ...makeAttributeService(defaultDoc), saveToLibrary: jest.fn().mockImplementation(() => Promise.reject('failed to save')) };
            const { props, saveProps, options } = getDefaultArgs(
                { lastKnownDoc: { ...defaultDoc, savedObjectId: undefined }, attributeService: attributeServiceMock },
                { saveToLibrary: true }
            );
            try {
                await runSaveLensVisualization(props, saveProps, options);
            } catch (error) {
                expect(props.notifications.toasts.addDanger).toHaveBeenCalled();
                expect(props.notifications.toasts.addSuccess).not.toHaveBeenCalled();
                expect(error.message).toEqual('failed to save')
            }
        });
    });

    describe('ES|QL', () => {
        it("should have a dedicated flow for textbased saving", async () => {
            const redirectTo = jest.fn();
            const switchDatasource = jest.fn();
            const stateTransferMock = createStateTransferMock({ clearEditorState: jest.fn() });
            // simulate a new save
            const attributeServiceMock = { ...makeAttributeService(defaultDoc), saveToLibrary: jest.fn().mockImplementation(async () => faker.random.uuid()) };

            const { props, saveProps, options } = getDefaultArgs(
                {
                    redirectTo,
                    switchDatasource,
                    stateTransfer: stateTransferMock,
                    textBasedLanguageSave: true,
                    attributeService: attributeServiceMock,
                    // give a document without a savedObjectId
                    lastKnownDoc: { ...defaultDoc, savedObjectId: undefined },
                    // simulate a fresh start in the editor
                    initialInput: undefined
                },
                {
                    newCopyOnSave: false,
                    saveToLibrary: true
                }
            );
            await runSaveLensVisualization(props, saveProps, options);
            expect(stateTransferMock.clearEditorState).toHaveBeenCalled();
            expect(switchDatasource).toHaveBeenCalled();
            expect(redirectTo).not.toHaveBeenCalled();
            expect(props.application.navigateToApp).toHaveBeenCalledWith('lens', { path: '/' })
        });
    });
});
