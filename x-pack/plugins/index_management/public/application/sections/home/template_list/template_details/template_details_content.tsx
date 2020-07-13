/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiCallOut,
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
} from '../../../../../../common/constants';
import { SendRequestResponse } from '../../../../../shared_imports';
import { TemplateDeleteModal, SectionLoading, SectionError, Error } from '../../../../components';
import { useLoadIndexTemplate } from '../../../../services/api';
import { decodePathFromReactRouter } from '../../../../services/routing';
import { useServices } from '../../../../app_context';
import { TabAliases, TabMappings, TabSettings } from '../../../../components/shared';
import { TemplateTypeIndicator } from '../components';
import { TabSummary } from './tabs';

const SUMMARY_TAB_ID = 'summary';
const MAPPINGS_TAB_ID = 'mappings';
const ALIASES_TAB_ID = 'aliases';
const SETTINGS_TAB_ID = 'settings';

const TABS = [
  {
    id: SUMMARY_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.templateDetails.summaryTabTitle', {
      defaultMessage: 'Summary',
    }),
  },
  {
    id: SETTINGS_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.templateDetails.settingsTabTitle', {
      defaultMessage: 'Settings',
    }),
  },
  {
    id: MAPPINGS_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.templateDetails.mappingsTabTitle', {
      defaultMessage: 'Mappings',
    }),
  },
  {
    id: ALIASES_TAB_ID,
    name: i18n.translate('xpack.idxMgmt.templateDetails.aliasesTabTitle', {
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

export interface Props {
  template: { name: string; isLegacy?: boolean };
  onClose: () => void;
  editTemplate: (name: string, isLegacy?: boolean) => void;
  cloneTemplate: (name: string, isLegacy?: boolean) => void;
  reload: () => Promise<SendRequestResponse>;
}

export const TemplateDetailsContent = ({
  template: { name: templateName, isLegacy },
  onClose,
  editTemplate,
  cloneTemplate,
  reload,
}: Props) => {
  const { uiMetricService } = useServices();
  const decodedTemplateName = decodePathFromReactRouter(templateName);
  const { error, data: templateDetails, isLoading } = useLoadIndexTemplate(
    decodedTemplateName,
    isLegacy
  );
  const isCloudManaged = templateDetails?._kbnMeta.type === 'cloudManaged';
  const [templateToDelete, setTemplateToDelete] = useState<
    Array<{ name: string; isLegacy?: boolean }>
  >([]);
  const [activeTab, setActiveTab] = useState<string>(SUMMARY_TAB_ID);
  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  const renderHeader = () => {
    return (
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="templateDetailsFlyoutTitle" data-test-subj="title">
            {decodedTemplateName}
            {templateDetails && (
              <>
                &nbsp;
                <TemplateTypeIndicator templateType={templateDetails._kbnMeta.type} />
              </>
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <SectionLoading>
          <FormattedMessage
            id="xpack.idxMgmt.templateDetails.loadingIndexTemplateDescription"
            defaultMessage="Loading template…"
          />
        </SectionLoading>
      );
    }

    if (error) {
      return (
        <SectionError
          title={
            <FormattedMessage
              id="xpack.idxMgmt.templateDetails.loadingIndexTemplateErrorMessage"
              defaultMessage="Error loading template"
            />
          }
          error={error as Error}
          data-test-subj="sectionError"
        />
      );
    }

    if (templateDetails) {
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

      const managedTemplateCallout = isCloudManaged && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.idxMgmt.templateDetails.cloudManagedTemplateInfoTitle"
                defaultMessage="Editing a cloud-managed template is not permitted."
              />
            }
            color="primary"
            size="s"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templateDetails.cloudManagedTemplateInfoDescription"
              defaultMessage="Cloud-managed templates are critical for internal operations."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      );

      return (
        <>
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
        </>
      );
    }
  };

  const renderFooter = () => {
    return (
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
                id="xpack.idxMgmt.templateDetails.closeButtonLabel"
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
                      id="xpack.idxMgmt.templateDetails.manageButtonLabel"
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
                        'xpack.idxMgmt.templateDetails.manageContextMenuPanelTitle',
                        {
                          defaultMessage: 'Template options',
                        }
                      ),
                      items: [
                        {
                          name: i18n.translate('xpack.idxMgmt.templateDetails.editButtonLabel', {
                            defaultMessage: 'Edit',
                          }),
                          icon: 'pencil',
                          onClick: () => editTemplate(templateName, isLegacy),
                          disabled: isCloudManaged,
                        },
                        {
                          name: i18n.translate('xpack.idxMgmt.templateDetails.cloneButtonLabel', {
                            defaultMessage: 'Clone',
                          }),
                          icon: 'copy',
                          onClick: () => cloneTemplate(templateName, isLegacy),
                        },
                        {
                          name: i18n.translate('xpack.idxMgmt.templateDetails.deleteButtonLabel', {
                            defaultMessage: 'Delete',
                          }),
                          icon: 'trash',
                          onClick: () =>
                            setTemplateToDelete([{ name: decodedTemplateName, isLegacy }]),
                          disabled: isCloudManaged,
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
    );
  };

  return (
    <>
      {renderHeader()}

      <EuiFlyoutBody data-test-subj="content">{renderBody()}</EuiFlyoutBody>

      {renderFooter()}

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
    </>
  );
};
