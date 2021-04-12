/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiTitle,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiText,
  EuiCodeBlock,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  ComponentTemplateDeserialized,
  serializers,
  serializeComponentTemplate,
} from '../../../shared_imports';

const { stripEmptyFields } = serializers;

const getDescriptionText = (data: any) => {
  const hasEntries = data && Object.entries(data).length > 0;

  return hasEntries ? (
    <FormattedMessage
      id="xpack.idxMgmt.componentTemplateForm.stepReview.summaryTab.yesDescriptionText"
      defaultMessage="Yes"
    />
  ) : (
    <FormattedMessage
      id="xpack.idxMgmt.componentTemplateForm.stepReview.summaryTab.noDescriptionText"
      defaultMessage="No"
    />
  );
};

interface Props {
  componentTemplate: ComponentTemplateDeserialized;
}

export const StepReview: React.FunctionComponent<Props> = React.memo(({ componentTemplate }) => {
  const { name } = componentTemplate;

  const serializedComponentTemplate = serializeComponentTemplate(
    stripEmptyFields(componentTemplate, {
      types: ['string'],
    }) as ComponentTemplateDeserialized
  );

  const {
    template: serializedTemplate,
    _meta: serializedMeta,
    version: serializedVersion,
  } = serializedComponentTemplate;

  const SummaryTab = () => (
    <div data-test-subj="summaryTab">
      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            {/* Version */}
            {typeof serializedVersion !== 'undefined' && (
              <>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.idxMgmt.templateForm.stepReview.summaryTab.versionLabel"
                    defaultMessage="Version"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>{serializedVersion}</EuiDescriptionListDescription>
              </>
            )}

            {/* Index settings */}
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateForm.stepReview.summaryTab.settingsLabel"
                defaultMessage="Index settings"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {getDescriptionText(serializedTemplate?.settings)}
            </EuiDescriptionListDescription>

            {/* Mappings */}
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateForm.stepReview.summaryTab.mappingLabel"
                defaultMessage="Mappings"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {getDescriptionText(serializedTemplate?.mappings)}
            </EuiDescriptionListDescription>

            {/* Aliases */}
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateForm.stepReview.summaryTab.aliasesLabel"
                defaultMessage="Aliases"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {getDescriptionText(serializedTemplate?.aliases)}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>

        <EuiFlexItem>
          {/* Metadata */}
          {serializedMeta && (
            <EuiDescriptionList textStyle="reverse">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepReview.summaryTab.metaLabel"
                  defaultMessage="Metadata"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiCodeBlock language="json">
                  {JSON.stringify(serializedMeta, null, 2)}
                </EuiCodeBlock>
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );

  const RequestTab = () => {
    const endpoint = `PUT _component_template/${name || '<componentTemplateName>'}`;
    const templateString = JSON.stringify(serializedComponentTemplate, null, 2);
    const request = `${endpoint}\n${templateString}`;

    // Beyond a certain point, highlighting the syntax will bog down performance to unacceptable
    // levels. This way we prevent that happening for very large requests.
    const language = request.length < 60000 ? 'json' : undefined;

    return (
      <div data-test-subj="requestTab">
        <EuiSpacer size="m" />

        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateForm.stepReview.requestTab.descriptionText"
              defaultMessage="This request will create the following component template."
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiCodeBlock language={language} isCopyable>
          {request}
        </EuiCodeBlock>
      </div>
    );
  };

  return (
    <div data-test-subj="stepReview">
      <EuiTitle>
        <h2 data-test-subj="title">
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplateForm.stepReview.stepTitle"
            defaultMessage="Review details for '{templateName}'"
            values={{ templateName: name }}
          />
        </h2>
      </EuiTitle>

      <EuiSpacer size="l" />

      <EuiTabbedContent
        data-test-subj="content"
        tabs={[
          {
            id: 'summary',
            name: i18n.translate('xpack.idxMgmt.componentTemplateForm.stepReview.summaryTabTitle', {
              defaultMessage: 'Summary',
            }),
            content: <SummaryTab />,
          },
          {
            id: 'request',
            name: i18n.translate('xpack.idxMgmt.componentTemplateForm.stepReview.requestTabTitle', {
              defaultMessage: 'Request',
            }),
            content: <RequestTab />,
          },
        ]}
      />
    </div>
  );
});
