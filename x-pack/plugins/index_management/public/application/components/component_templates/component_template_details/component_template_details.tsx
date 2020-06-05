/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiPopover,
  EuiButton,
  EuiContextMenu,
  EuiCallOut,
} from '@elastic/eui';

import { SectionLoading } from '../shared_imports';
import { ComponentTemplateDeserialized } from '../types';
import { useComponentTemplatesContext } from '../component_templates_context';
import { TabSummary, TabSettings, TabAliases, TabMappings } from './tab_content';
import { ComponentTemplateTabs, TabType, Tab } from './tabs';

const tabToComponentMap: {
  [key: string]: React.FunctionComponent<{
    componentTemplateDetails: ComponentTemplateDeserialized;
  }>;
} = {
  [TabType.Summary]: TabSummary,
  [TabType.Settings]: TabSettings,
  [TabType.Mappings]: TabMappings,
  [TabType.Aliases]: TabAliases,
};

interface Props {
  componentTemplateName: string;
  onClose: () => void;
  onDeleteClick: (componentTemplateName: string[]) => void;
  showFooter?: boolean;
}

export const ComponentTemplateDetailsFlyout: React.FunctionComponent<Props> = ({
  componentTemplateName,
  onClose,
  onDeleteClick,
  showFooter,
}) => {
  const { api } = useComponentTemplatesContext();

  const { data: componentTemplateDetails, isLoading, error } = api.useLoadComponentTemplate(
    componentTemplateName
  );

  const [activeTab, setActiveTab] = useState<Tab>(TabType.Summary);
  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  let content: React.ReactNode | undefined;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateDetails.loadingIndexTemplateDescription"
          defaultMessage="Loading component template…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplateDetails.loadingErrorMessage"
            defaultMessage="Error loading component template"
          />
        }
        color="danger"
        iconType="alert"
        data-test-subj="sectionError"
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  } else if (componentTemplateDetails) {
    const TabContent = tabToComponentMap[activeTab];

    content = (
      <>
        <ComponentTemplateTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <EuiSpacer size="l" />

        <TabContent componentTemplateDetails={componentTemplateDetails} />
      </>
    );
  }

  const footer: React.ReactNode = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        {/* "Close" link */}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            flush="left"
            onClick={onClose}
            data-test-subj="closeDetailsButton"
          >
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateDetails.closeButtonLabel"
              defaultMessage="Close"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>

        {/* "Manage" context menu */}
        {componentTemplateDetails && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="manageComponentTemplatePanel"
              button={
                <EuiButton
                  fill
                  data-test-subj="manageComponentTemplateButton"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={() => setIsPopOverOpen((prevBoolean) => !prevBoolean)}
                >
                  <FormattedMessage
                    id="xpack.idxMgmt.componentTemplateDetails.manageButtonLabel"
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
                      'xpack.idxMgmt.componentTemplateDetails.manageContextMenuPanelTitle',
                      {
                        defaultMessage: 'Options',
                      }
                    ),
                    items: [
                      {
                        name: i18n.translate(
                          'xpack.idxMgmt.componentTemplateDetails.deleteButtonLabel',
                          {
                            defaultMessage: 'Delete',
                          }
                        ),
                        icon: 'trash',
                        disabled: componentTemplateDetails._kbnMeta.usedBy.length > 0,
                        onClick: () => {
                          setIsPopOverOpen(false);
                          onDeleteClick([componentTemplateName]);
                        },
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

  return (
    <EuiFlyout
      onClose={onClose}
      data-test-subj="componentTemplateDetails"
      aria-labelledby="componentTemplateDetailsFlyoutTitle"
      size="m"
      maxWidth={500}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id="componentTemplateDetailsFlyoutTitle" data-test-subj="title">
            {componentTemplateName}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody data-test-subj="content">{content}</EuiFlyoutBody>

      {showFooter ? footer : null}
    </EuiFlyout>
  );
};
