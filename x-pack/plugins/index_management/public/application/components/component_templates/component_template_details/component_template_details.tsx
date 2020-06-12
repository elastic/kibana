/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
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
  EuiCallOut,
} from '@elastic/eui';

import { SectionLoading, TabSettings, TabAliases, TabMappings } from '../shared_imports';
import { useComponentTemplatesContext } from '../component_templates_context';
import { TabSummary } from './tab_summary';
import { ComponentTemplateTabs, TabType, Tab } from './tabs';
import { ManageButton, ManageAction } from './manage_button';

interface Props {
  componentTemplateName: string;
  onClose: () => void;
  showFooter?: boolean;
  actions?: ManageAction[];
}

export const ComponentTemplateDetailsFlyout: React.FunctionComponent<Props> = ({
  componentTemplateName,
  onClose,
  actions,
}) => {
  const { api } = useComponentTemplatesContext();

  const { data: componentTemplateDetails, isLoading, error } = api.useLoadComponentTemplate(
    componentTemplateName
  );

  const [activeTab, setActiveTab] = useState<Tab>(TabType.Summary);

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
    const {
      template: { settings, mappings, aliases },
    } = componentTemplateDetails;

    const tabToComponentMap: {
      [key: string]: React.ReactNode;
    } = {
      [TabType.Summary]: <TabSummary componentTemplateDetails={componentTemplateDetails} />,
      [TabType.Settings]: <TabSettings settings={settings} />,
      [TabType.Mappings]: <TabMappings mappings={mappings} />,
      [TabType.Aliases]: <TabAliases aliases={aliases} />,
    };

    const tabContent = tabToComponentMap[activeTab];

    content = (
      <>
        <ComponentTemplateTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <EuiSpacer size="l" />

        {tabContent}
      </>
    );
  }

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

      {actions && (
        <EuiFlyoutFooter data-test-subj="footer">
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
                <ManageButton
                  actions={actions}
                  componentTemplateDetails={componentTemplateDetails}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
};
