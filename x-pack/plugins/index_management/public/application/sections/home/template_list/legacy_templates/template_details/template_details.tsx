/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiTab,
  EuiTabs,
  EuiSpacer,
  EuiPopover,
  EuiButton,
  EuiContextMenu,
} from '@elastic/eui';
import {
  UIM_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_SETTINGS_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_ALIASES_TAB,
} from '../../../../../../../common/constants';
import {
  TemplateDeleteModal,
  SectionLoading,
  SectionError,
  Error,
} from '../../../../../components';
import { useLoadIndexTemplate } from '../../../../../services/api';
import { decodePathFromReactRouter } from '../../../../../services/routing';
import { SendRequestResponse } from '../../../../../../shared_imports';
import { useServices } from '../../../../../app_context';
import { TabAliases, TabMappings, TabSettings } from '../../../../../components/shared';
import { TabSummary } from '../../template_details/tabs';

interface Props {
  template: { name: string; isLegacy?: boolean };
  onClose: () => void;
  editTemplate: (name: string, isLegacy?: boolean) => void;
  cloneTemplate: (name: string, isLegacy?: boolean) => void;
  reload: () => Promise<SendRequestResponse>;
}

const SUMMARY_TAB_ID = 'summary';
const MAPPINGS_TAB_ID = 'mappings';
const ALIASES_TAB_ID = 'aliases';
const SETTINGS_TAB_ID = 'settings';

const TABS = [
  {
    id: SUMMARY_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.legacyTemplateDetails.summaryTabTitle', {
      defaultMessage: 'Summary',
    }),
  },
  {
    id: SETTINGS_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.legacyTemplateDetails.settingsTabTitle', {
      defaultMessage: 'Settings',
    }),
  },
  {
    id: MAPPINGS_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.legacyTemplateDetails.mappingsTabTitle', {
      defaultMessage: 'Mappings',
    }),
  },
  {
    id: ALIASES_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.legacyTemplateDetails.aliasesTabTitle', {
      defaultMessage: 'Aliases',
    }),
  },
];

const tabToUiMetricMap: { [key: string]: string } = {
  [SUMMARY_TAB_ID]: UIM_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB,
  [SETTINGS_TAB_ID]: UIM_TEMPLATE_DETAIL_PANEL_SETTINGS_TAB,
  [MAPPINGS_TAB_ID]: UIM_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB,
  [ALIASES_TAB_ID]: UIM_TEMPLATE_DETAIL_PANEL_ALIASES_TAB,
};

export const LegacyTemplateDetails: React.FunctionComponent<Props> = ({
  template: { name: templateName, isLegacy },
  onClose,
  editTemplate,
  cloneTemplate,
  reload,
}) => {
  const { uiMetricService } = useServices();
  const decodedTemplateName = decodePathFromReactRouter(templateName);
  const { error, data: templateDetails, isLoading } = useLoadIndexTemplate(
    decodedTemplateName,
    isLegacy
  );
  const isManaged = templateDetails?._kbnMeta.isManaged ?? false;
  const [templateToDelete, setTemplateToDelete] = useState<
    Array<{ name: string; isLegacy?: boolean }>
  >([]);
  const [activeTab, setActiveTab] = useState<string>(SUMMARY_TAB_ID);
  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  let content;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.legacyTemplateDetails.loadingIndexTemplateDescription"
          defaultMessage="Loading template…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.legacyTemplateDetails.loadingIndexTemplateErrorMessage"
            defaultMessage="Error loading template"
          />
        }
        error={error as Error}
        data-test-subj="sectionError"
      />
    );
  } else if (templateDetails) {
    const {
      template: { settings, mappings, aliases },
    } = templateDetails;

    const tabToComponentMap: Record<string, React.ReactNode> = {
      [SUMMARY_TAB_ID]: <TabSummary templateDetails={templateDetails} />,
      [SETTINGS_TAB_ID]: <TabSettings settings={settings} />,
      [MAPPINGS_TAB_ID]: <TabMappings mappings={mappings} />,
      [ALIASES_TAB_ID]: <TabAliases aliases={aliases} />,
    };

    const tabContent = tabToComponentMap[activeTab];

    const managedTemplateCallout = isManaged ? (
      <Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.idxMgmt.legacyTemplateDetails.managedTemplateInfoTitle"
              defaultMessage="Editing a managed template is not permitted"
            />
          }
          color="primary"
          size="s"
        >
          <FormattedMessage
            id="xpack.idxMgmt.legacyTemplateDetails.managedTemplateInfoDescription"
            defaultMessage="Managed templates are critical for internal operations."
          />
        </EuiCallOut>
        <EuiSpacer size="m" />
      </Fragment>
    ) : null;

    content = (
      <Fragment>
        {managedTemplateCallout}

        <EuiTabs>
          {TABS.map((tab) => (
            <EuiTab
              onClick={() => {
                uiMetricService.trackMetric('click', tabToUiMetricMap[tab.id]);
                setActiveTab(tab.id);
              }}
              isSelected={tab.id === activeTab}
              key={tab.id}
              data-test-subj="tab"
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="l" />

        {tabContent}
      </Fragment>
    );
  }

  return (
    <Fragment>
      {templateToDelete && templateToDelete.length > 0 ? (
        <TemplateDeleteModal
          callback={(data) => {
            if (data && data.hasDeletedTemplates) {
              reload();
            } else {
              setTemplateToDelete([]);
            }
            onClose();
          }}
          templatesToDelete={templateToDelete}
        />
      ) : null}

      <EuiFlyout
        onClose={onClose}
        data-test-subj="templateDetails"
        aria-labelledby="templateDetailsFlyoutTitle"
        size="m"
        maxWidth={500}
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2 id="templateDetailsFlyoutTitle" data-test-subj="title">
              {decodedTemplateName}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody data-test-subj="content">{content}</EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                flush="left"
                onClick={onClose}
                data-test-subj="closeDetailsButton"
              >
                <FormattedMessage
                  id="xpack.idxMgmt.legacyTemplateDetails.closeButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {templateDetails && (
              <EuiFlexItem grow={false}>
                {/* Manage templates context menu */}
                <EuiPopover
                  id="manageTemplatePanel"
                  button={
                    <EuiButton
                      fill
                      data-test-subj="manageTemplateButton"
                      iconType="arrowDown"
                      iconSide="right"
                      onClick={() => setIsPopOverOpen((prev) => !prev)}
                    >
                      <FormattedMessage
                        id="xpack.idxMgmt.legacyTemplateDetails.manageButtonLabel"
                        defaultMessage="Manage"
                      />
                    </EuiButton>
                  }
                  isOpen={isPopoverOpen}
                  closePopover={() => setIsPopOverOpen(false)}
                  panelPaddingSize="none"
                  withTitle
                  anchorPosition="rightUp"
                  repositionOnScroll
                >
                  <EuiContextMenu
                    initialPanelId={0}
                    panels={[
                      {
                        id: 0,
                        title: i18n.translate(
                          'xpack.idxMgmt.legacyTemplateDetails.manageContextMenuPanelTitle',
                          {
                            defaultMessage: 'Template options',
                          }
                        ),
                        items: [
                          {
                            name: i18n.translate(
                              'xpack.idxMgmt.legacyTemplateDetails.editButtonLabel',
                              {
                                defaultMessage: 'Edit',
                              }
                            ),
                            icon: 'pencil',
                            onClick: () => editTemplate(templateName, isLegacy),
                            disabled: isManaged,
                          },
                          {
                            name: i18n.translate(
                              'xpack.idxMgmt.legacyTemplateDetails.cloneButtonLabel',
                              {
                                defaultMessage: 'Clone',
                              }
                            ),
                            icon: 'copy',
                            onClick: () => cloneTemplate(templateName, isLegacy),
                          },
                          {
                            name: i18n.translate(
                              'xpack.idxMgmt.legacyTemplateDetails.deleteButtonLabel',
                              {
                                defaultMessage: 'Delete',
                              }
                            ),
                            icon: 'trash',
                            onClick: () =>
                              setTemplateToDelete([{ name: decodedTemplateName, isLegacy }]),
                            disabled: isManaged,
                          },
                        ],
                      },
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </Fragment>
  );
};
