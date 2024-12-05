import React, { FC, PropsWithChildren } from 'react';
import { render, renderHook } from '@testing-library/react';
import NavControls from '.';
import { ChromeNavControl } from '@kbn/core/public';
import { createHtmlPortalNode, OutPortal } from 'react-reverse-portal';
import { TestProviders } from '@kbn/elastic-assistant/impl/mock/test_providers/test_providers';
import { useAssistantContext } from "@kbn/elastic-assistant/impl/assistant_context"

const MockNavigationBar = OutPortal

const mockShowAssistantOverlay = jest.fn();
const mockRegisterRight = jest.fn()

jest.mock('@kbn/elastic-assistant/impl/assistant_context', () => ({
    ...jest.requireActual('@kbn/elastic-assistant/impl/assistant_context'),
    useAssistantContext: jest.fn()
}));

jest.mock('@kbn/security-solution-navigation/src/context', () => ({
    ...jest.requireActual('@kbn/security-solution-navigation/src/context'),
    useNavigationContext: () => ({
        chrome: {
            navControls: {
                registerRight: mockRegisterRight,
            }
        }
    })
}));


const ProviderWrapper: FC<PropsWithChildren> = ({ children }) => {
    return <TestProviders>
        {children}
    </TestProviders>
}

describe('NavControls', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (useAssistantContext as jest.Mock).mockReturnValue({
            showAssistantOverlay: mockShowAssistantOverlay,
            assistantAvailability: {
                hasAssistantPrivilege: true
            }
        })
    });

    it('should register link in nav bar', () => {
        render(<NavControls />, { wrapper: ProviderWrapper });
        expect(mockRegisterRight).toHaveBeenCalledTimes(1)
    });


    it('should render the header link text', async () => {
        const { result: portalNode } = renderHook(() => React.useMemo(() => createHtmlPortalNode(), []));

        mockRegisterRight.mockImplementationOnce((chromeNavControl: ChromeNavControl) => {
            chromeNavControl.mount(portalNode.current.element)
        })

        const { queryByText, queryByTestId } = render(
            <>
                <MockNavigationBar node={portalNode.current} />
                <NavControls />
            </>
            , { wrapper: ProviderWrapper });

        expect(queryByTestId('assistantNavLink')).toBeInTheDocument()
        expect(queryByText('AI Assistant')).toBeInTheDocument();
    });

    it('should not render the header link if not authorized', () => {
        const { result: portalNode } = renderHook(() => React.useMemo(() => createHtmlPortalNode(), []));

        (useAssistantContext as jest.Mock).mockReturnValue({
            showAssistantOverlay: mockShowAssistantOverlay,
            assistantAvailability: {
                hasAssistantPrivilege: false
            }
        })

        mockRegisterRight.mockImplementationOnce((chromeNavControl: ChromeNavControl) => {
            chromeNavControl.mount(portalNode.current.element)
        })

        const { queryByText, queryByTestId } = render(
            <>
                <MockNavigationBar node={portalNode.current} />
                <NavControls />
            </>, { wrapper: ProviderWrapper });
        expect(queryByTestId('assistantNavLink')).not.toBeInTheDocument();
        expect(queryByText('AI Assistant')).not.toBeInTheDocument();
    });

    it('should call the assistant overlay to show on click', () => {
        const { result: portalNode } = renderHook(() => React.useMemo(() => createHtmlPortalNode(), []));

        mockRegisterRight.mockImplementationOnce((chromeNavControl: ChromeNavControl) => {
            chromeNavControl.mount(portalNode.current.element)
        })

        const { queryByTestId } = render(<>
            <MockNavigationBar node={portalNode.current} />
            <NavControls />
        </>, { wrapper: ProviderWrapper });
        queryByTestId('assistantNavLink')?.click();
        expect(mockShowAssistantOverlay).toHaveBeenCalledTimes(1);
        expect(mockShowAssistantOverlay).toHaveBeenCalledWith({ showOverlay: true });
    });
})