/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AsyncTestBedConfig,
  reactRouterMock,
  registerTestBed,
  TestBed,
} from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';
import { act } from 'react-dom/test-utils';
import { keys } from '@elastic/eui';
import { IndexDetailsTabId } from '../../../common/constants';
import { IndexDetailsPage } from '../../../public/application/sections/home/index_list/details_page';
import { WithAppDependencies } from '../helpers';
import { testIndexName } from './mocks';
import { MappingField } from '../index_template_wizard/template_form.helpers';

let routerMock: typeof reactRouterMock;
const getTestBedConfig = (initialEntry?: string): AsyncTestBedConfig => ({
  memoryRouter: {
    initialEntries: [initialEntry ?? `/indices/index_details?indexName=${testIndexName}`],
    componentRoutePath: `/indices/index_details`,
    onRouter: (router) => {
      routerMock = router;
    },
  },
  doMountAsync: true,
});

export interface IndexDetailsPageTestBed extends TestBed {
  routerMock: typeof reactRouterMock;
  actions: {
    getHeader: () => string;
    clickIndexDetailsTab: (tab: IndexDetailsTabId) => Promise<void>;
    getIndexDetailsTabs: () => string[];
    getActiveTabContent: () => string;
    mappings: {
      addNewMappingFieldNameAndType: (mappingFields?: MappingField[]) => Promise<void>;
      clickFilterByFieldType: () => Promise<void>;
      selectFilterFieldType: (fieldType: string) => Promise<void>;
      clickAddFieldButton: () => Promise<void>;
      clickSaveMappingsButton: () => Promise<void>;
      getCodeBlockContent: () => string;
      getDocsLinkHref: () => string;
      isErrorDisplayed: () => boolean;
      isSaveMappingsErrorDisplayed: () => boolean;
      clickErrorReloadButton: () => Promise<void>;
      getTreeViewContent: (fieldName: string) => string;
      clickToggleViewButton: () => Promise<void>;
      isSearchBarDisabled: () => boolean;
      setSearchBarValue: (searchValue: string) => Promise<void>;
      findSearchResult: () => string;
      isSemanticTextBannerVisible: () => boolean;
      selectSemanticTextField: (name: string, type: string) => Promise<void>;
      isReferenceFieldVisible: () => void;
      selectInferenceIdButtonExists: () => void;
      openSelectInferencePopover: () => void;
      expectDefaultInferenceModelToExists: () => void;
      expectCustomInferenceModelToExists: (customInference: string) => void;
    };
    settings: {
      getCodeBlockContent: () => string;
      getDocsLinkHref: () => string;
      isErrorDisplayed: () => boolean;
      clickErrorReloadButton: () => Promise<void>;
      clickEditModeSwitch: () => Promise<void>;
      getCodeEditorContent: () => string;
      updateCodeEditorContent: (value: string) => Promise<void>;
      saveSettings: () => Promise<void>;
      resetChanges: () => Promise<void>;
    };
    clickBackToIndicesButton: () => Promise<void>;
    discoverLinkExists: () => boolean;
    contextMenu: {
      clickManageIndexButton: () => Promise<void>;
      isOpened: () => boolean;
      clickIndexAction: (indexAction: string) => Promise<void>;
      confirmForcemerge: (numSegments: string) => Promise<void>;
      confirmDelete: () => Promise<void>;
    };
    errorSection: {
      isDisplayed: () => boolean;
      clickReloadButton: () => Promise<void>;
      noIndexNameMessageIsDisplayed: () => boolean;
    };
    stats: {
      getCodeBlockContent: () => string;
      getDocsLinkHref: () => string;
      isErrorDisplayed: () => boolean;
      clickErrorReloadButton: () => Promise<void>;
      indexStatsTabExists: () => boolean;
      isWarningDisplayed: () => boolean;
    };
    overview: {
      storageDetailsExist: () => boolean;
      getStorageDetailsContent: () => string;
      statusDetailsExist: () => boolean;
      getStatusDetailsContent: () => string;
      aliasesDetailsExist: () => boolean;
      getAliasesDetailsContent: () => string;
      dataStreamDetailsExist: () => boolean;
      getDataStreamDetailsContent: () => string;
      reloadDataStreamDetails: () => Promise<void>;
      addDocCodeBlockExists: () => boolean;
    };
  };
}

export const setup = async ({
  httpSetup,
  dependencies = {},
  initialEntry,
}: {
  httpSetup: HttpSetup;
  dependencies?: any;
  initialEntry?: string;
}): Promise<IndexDetailsPageTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(IndexDetailsPage, httpSetup, dependencies),
    getTestBedConfig(initialEntry)
  );
  const testBed = await initTestBed();
  const { find, component, exists } = testBed;

  const errorSection = {
    isDisplayed: () => {
      return exists('indexDetailsErrorLoadingDetails');
    },
    clickReloadButton: async () => {
      await act(async () => {
        find('indexDetailsReloadDetailsButton').simulate('click');
      });
      component.update();
    },
    noIndexNameMessageIsDisplayed: () => {
      return exists('indexDetailsNoIndexNameError');
    },
  };
  const getHeader = () => {
    return component.find('[data-test-subj="indexDetailsHeader"] h1').text();
  };

  const clickIndexDetailsTab = async (tab: IndexDetailsTabId) => {
    await act(async () => {
      find(`indexDetailsTab-${tab}`).simulate('click');
    });
    component.update();
  };

  const getIndexDetailsTabs = () => {
    return component
      .find('div[role="tablist"] button[data-test-subj^="indexDetailsTab"]')
      .map((tab) => tab.text());
  };

  const getActiveTabContent = () => {
    return find('indexDetailsContent').text();
  };

  const overview = {
    storageDetailsExist: () => {
      return exists('indexDetailsStorage');
    },
    getStorageDetailsContent: () => {
      return find('indexDetailsStorage').text();
    },
    statusDetailsExist: () => {
      return exists('indexDetailsStatus');
    },
    getStatusDetailsContent: () => {
      return find('indexDetailsStatus').text();
    },
    aliasesDetailsExist: () => {
      return exists('indexDetailsAliases');
    },
    getAliasesDetailsContent: () => {
      return find('indexDetailsAliases').text();
    },
    dataStreamDetailsExist: () => {
      return exists('indexDetailsDataStream');
    },
    getDataStreamDetailsContent: () => {
      return find('indexDetailsDataStream').text();
    },
    reloadDataStreamDetails: async () => {
      await act(async () => {
        find('indexDetailsDataStreamReload').simulate('click');
      });
      component.update();
    },
    addDocCodeBlockExists: () => {
      return exists('codeBlockControlsPanel');
    },
  };

  const mappings = {
    getCodeBlockContent: () => {
      return find('indexDetailsMappingsCodeBlock').text();
    },
    getDocsLinkHref: () => {
      return find('indexDetailsMappingsDocsLink').prop('href');
    },
    isErrorDisplayed: () => {
      return exists('indexDetailsMappingsError');
    },
    clickErrorReloadButton: async () => {
      await act(async () => {
        find('indexDetailsMappingsReloadButton').simulate('click');
      });
      component.update();
    },
    getTreeViewContent: (fieldName: string) => {
      expect(exists(fieldName)).toBe(true);
      return find(fieldName).text();
    },

    clickToggleViewButton: async () => {
      await act(async () => {
        expect(exists('indexDetailsMappingsToggleViewButton')).toBe(true);
        find('indexDetailsMappingsToggleViewButton').simulate('click');
      });
      component.update();
    },
    clickFilterByFieldType: async () => {
      expect(exists('indexDetailsMappingsFilterByFieldTypeButton')).toBe(true);
      await act(async () => {
        find('indexDetailsMappingsFilterByFieldTypeButton').simulate('click');
      });
      component.update();
    },
    selectFilterFieldType: async (fieldType: string) => {
      expect(testBed.exists(fieldType)).toBe(true);
      await act(async () => {
        find(fieldType).simulate('click');
      });
      component.update();
    },
    isSearchBarDisabled: () => {
      return find('indexDetailsMappingsFieldSearch').prop('disabled');
    },
    setSearchBarValue: async (searchValue: string) => {
      await act(async () => {
        testBed
          .find('indexDetailsMappingsFieldSearch')
          .simulate('change', { target: { value: searchValue } });
      });
      component.update();
    },
    findSearchResult: () => {
      expect(testBed.exists('fieldName')).toBe(true);
      return testBed.find('fieldName').text();
    },
    isSemanticTextBannerVisible: () => {
      return exists('indexDetailsMappingsSemanticTextBanner');
    },
    clickAddFieldButton: async () => {
      expect(exists('indexDetailsMappingsAddField')).toBe(true);
      await act(async () => {
        find('indexDetailsMappingsAddField').simulate('click');
      });
      component.update();
    },
    clickSaveMappingsButton: async () => {
      expect(exists('indexDetailsMappingsSaveMappings')).toBe(true);
      expect(find('indexDetailsMappingsSaveMappings').props().disabled).toBeFalsy();
      await act(async () => {
        find('indexDetailsMappingsSaveMappings').simulate('click');
      });
      component.update();
    },
    isSaveMappingsErrorDisplayed: () => {
      return exists('indexDetailsSaveMappingsError');
    },
    addNewMappingFieldNameAndType: async (mappingFields?: MappingField[]) => {
      const { form } = testBed;
      if (mappingFields) {
        for (const field of mappingFields) {
          const { name, type } = field;
          await act(async () => {
            form.setInputValue('nameParameterInput', name);
            find('createFieldForm').simulate('change', [
              {
                label: type,
                value: type,
              },
            ]);
          });

          await act(async () => {
            expect(exists('createFieldForm.addButton')).toBe(true);
            expect(find('createFieldForm.addButton').props().disabled).toBeFalsy();
            find('createFieldForm.addButton').simulate('click');
          });

          component.update();
        }
      }
    },
    selectSemanticTextField: async (name: string, type: string) => {
      expect(exists('comboBoxSearchInput')).toBe(true);

      const { form } = testBed;
      form.setInputValue('nameParameterInput', name);
      form.setInputValue('comboBoxSearchInput', type);
      await act(async () => {
        find('comboBoxSearchInput').simulate('keydown', { key: keys.ENTER });
      });
      // select semantic_text field
      await act(async () => {
        expect(exists('fieldTypesOptions-semantic_text')).toBe(true);
        find('fieldTypesOptions-semantic_text').simulate('click');
        expect(exists('fieldTypesOptions-semantic_text')).toBe(false);
      });
    },
    isReferenceFieldVisible: () => {
      expect(exists('referenceFieldSelect')).toBe(true);
    },
    selectInferenceIdButtonExists: () => {
      expect(exists('selectInferenceId')).toBe(true);
      expect(exists('inferenceIdButton')).toBe(true);
      find('inferenceIdButton').simulate('click');
    },
    openSelectInferencePopover: () => {
      expect(exists('addInferenceEndpointButton')).toBe(true);
      expect(exists('manageInferenceEndpointButton')).toBe(true);
    },
    expectDefaultInferenceModelToExists: () => {
      expect(exists('custom-inference_elser_model_2')).toBe(true);
      expect(exists('custom-inference_e5')).toBe(true);
    },
    expectCustomInferenceModelToExists: (customInference: string) => {
      expect(exists(customInference)).toBe(true);
    },
  };

  const settings = {
    getCodeBlockContent: () => {
      return find('indexDetailsSettingsCodeBlock').text();
    },
    getDocsLinkHref: () => {
      return find('indexDetailsSettingsDocsLink').prop('href');
    },
    isErrorDisplayed: () => {
      return exists('indexDetailsSettingsError');
    },
    clickErrorReloadButton: async () => {
      await act(async () => {
        find('indexDetailsSettingsReloadButton').simulate('click');
      });
      component.update();
    },
    clickEditModeSwitch: async () => {
      await act(async () => {
        find('indexDetailsSettingsEditModeSwitch').simulate('click');
      });
      component.update();
    },
    getCodeEditorContent: () => {
      return find('indexDetailsSettingsEditor').prop('data-currentvalue');
    },
    updateCodeEditorContent: async (value: string) => {
      // the code editor is mocked as an input so need to set data-currentvalue attribute to change the value
      find('indexDetailsSettingsEditor').getDOMNode().setAttribute('data-currentvalue', value);
      await act(async () => {
        find('indexDetailsSettingsEditor').simulate('change');
      });
      component.update();
    },
    saveSettings: async () => {
      await act(async () => {
        find('indexDetailsSettingsSave').simulate('click');
      });
      component.update();
    },
    resetChanges: async () => {
      await act(async () => {
        find('indexDetailsSettingsResetChanges').simulate('click');
      });
      component.update();
    },
  };

  const clickBackToIndicesButton = async () => {
    await act(async () => {
      find('indexDetailsBackToIndicesButton').simulate('click');
    });
    component.update();
  };

  const discoverLinkExists = () => {
    return exists('discoverButtonLink');
  };

  const contextMenu = {
    clickManageIndexButton: async () => {
      await act(async () => {
        find('indexActionsContextMenuButton').simulate('click');
      });
      component.update();
    },
    isOpened: () => {
      return exists('indexContextMenu');
    },
    clickIndexAction: async (indexAction: string) => {
      await act(async () => {
        find(`indexContextMenu.${indexAction}`).simulate('click');
      });
      component.update();
    },
    confirmForcemerge: async (numSegments: string) => {
      await act(async () => {
        testBed.form.setInputValue('indexActionsForcemergeNumSegments', numSegments);
      });
      component.update();
      await act(async () => {
        find('confirmModalConfirmButton').simulate('click');
      });
      component.update();
    },
    confirmDelete: async () => {
      await act(async () => {
        find('confirmModalConfirmButton').simulate('click');
      });
      component.update();
    },
  };

  const stats = {
    indexStatsTabExists: () => {
      return exists('indexDetailsTab-stats');
    },
    getCodeBlockContent: () => {
      return find('indexDetailsStatsCodeBlock').text();
    },
    getDocsLinkHref: () => {
      return find('indexDetailsStatsDocsLink').prop('href');
    },
    isErrorDisplayed: () => {
      return exists('indexDetailsStatsError');
    },
    isWarningDisplayed: () => {
      return exists('indexStatsNotAvailableWarning');
    },
    clickErrorReloadButton: async () => {
      await act(async () => {
        find('reloadIndexStatsButton').simulate('click');
      });
      component.update();
    },
  };
  return {
    ...testBed,
    routerMock,
    actions: {
      getHeader,
      clickIndexDetailsTab,
      getIndexDetailsTabs,
      getActiveTabContent,
      mappings,
      settings,
      overview,
      clickBackToIndicesButton,
      discoverLinkExists,
      contextMenu,
      errorSection,
      stats,
    },
  };
};
