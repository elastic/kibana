/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
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
  EuiCallOut,
  EuiLink,
  EuiCodeBlock,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { serializers } from '../../../../shared_imports';

import { serializeLegacyTemplate, serializeTemplate } from '../../../../../common/lib';
import { TemplateDeserialized, getTemplateParameter } from '../../../../../common';
import { WizardSection } from '../template_form';

const { stripEmptyFields } = serializers;

const NoneDescriptionText = () => (
  <FormattedMessage
    id="xpack.idxMgmt.templateForm.stepReview.summaryTab.noneDescriptionText"
    defaultMessage="None"
  />
);

const getDescriptionText = (data: any) => {
  const hasEntries = data && Object.entries(data).length > 0;

  return hasEntries ? (
    <FormattedMessage
      id="xpack.idxMgmt.templateForm.stepReview.summaryTab.yesDescriptionText"
      defaultMessage="Yes"
    />
  ) : (
    <FormattedMessage
      id="xpack.idxMgmt.templateForm.stepReview.summaryTab.noDescriptionText"
      defaultMessage="No"
    />
  );
};

interface Props {
  template: TemplateDeserialized;
  navigateToStep: (stepId: WizardSection) => void;
}

export const StepReview: React.FunctionComponent<Props> = React.memo(
  ({ template, navigateToStep }) => {
    const {
      name,
      indexPatterns,
      version,
      order,
      priority,
      composedOf,
      _meta,
      _kbnMeta: { isLegacy },
    } = template!;

    const serializedTemplate = isLegacy
      ? serializeLegacyTemplate(
          stripEmptyFields(template!, {
            types: ['string'],
          }) as TemplateDeserialized
        )
      : serializeTemplate(
          stripEmptyFields(template!, {
            types: ['string'],
          }) as TemplateDeserialized
        );

    const serializedMappings = getTemplateParameter(serializedTemplate, 'mappings');
    const serializedSettings = getTemplateParameter(serializedTemplate, 'settings');
    const serializedAliases = getTemplateParameter(serializedTemplate, 'aliases');

    const numIndexPatterns = indexPatterns!.length;

    const hasWildCardIndexPattern = Boolean(indexPatterns!.find((pattern) => pattern === '*'));

    const SummaryTab = () => (
      <div data-test-subj="summaryTab">
        <EuiSpacer size="m" />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              {/* Index patterns */}
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepReview.summaryTab.indexPatternsLabel"
                  defaultMessage="Index {numIndexPatterns, plural, one {pattern} other {patterns}}"
                  values={{ numIndexPatterns }}
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {numIndexPatterns > 1 ? (
                  <EuiText>
                    <ul>
                      {indexPatterns!.map((indexName: string, i: number) => {
                        return (
                          <li key={`${indexName}-${i}`}>
                            <EuiTitle size="xs">
                              <span>{indexName}</span>
                            </EuiTitle>
                          </li>
                        );
                      })}
                    </ul>
                  </EuiText>
                ) : (
                  indexPatterns!.toString()
                )}
              </EuiDescriptionListDescription>

              {/* Priority / Order */}
              {isLegacy ? (
                <>
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      id="xpack.idxMgmt.templateForm.stepReview.summaryTab.orderLabel"
                      defaultMessage="Order"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    {order ? order : <NoneDescriptionText />}
                  </EuiDescriptionListDescription>
                </>
              ) : (
                <>
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      id="xpack.idxMgmt.templateForm.stepReview.summaryTab.priorityLabel"
                      defaultMessage="Priority"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    {priority ? priority : <NoneDescriptionText />}
                  </EuiDescriptionListDescription>
                </>
              )}

              {/* Version */}
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepReview.summaryTab.versionLabel"
                  defaultMessage="Version"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {version ? version : <NoneDescriptionText />}
              </EuiDescriptionListDescription>

              {/* components */}
              {isLegacy !== true && (
                <>
                  <EuiDescriptionListTitle>
                    <FormattedMessage
                      id="xpack.idxMgmt.templateForm.stepReview.summaryTab.componentsLabel"
                      defaultMessage="Components"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    {composedOf && composedOf.length > 0 ? (
                      composedOf.length > 1 ? (
                        <EuiText>
                          <ul>
                            {composedOf.map((component: string, i: number) => {
                              return (
                                <li key={`${component}-${i}`}>
                                  <EuiTitle size="xs">
                                    <span>{component}</span>
                                  </EuiTitle>
                                </li>
                              );
                            })}
                          </ul>
                        </EuiText>
                      ) : (
                        composedOf.toString()
                      )
                    ) : (
                      <NoneDescriptionText />
                    )}
                  </EuiDescriptionListDescription>
                </>
              )}
            </EuiDescriptionList>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiDescriptionList textStyle="reverse">
              {/* Index settings */}
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepReview.summaryTab.settingsLabel"
                  defaultMessage="Index settings"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {getDescriptionText(serializedSettings)}
              </EuiDescriptionListDescription>

              {/* Mappings */}
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepReview.summaryTab.mappingLabel"
                  defaultMessage="Mappings"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {getDescriptionText(serializedMappings)}
              </EuiDescriptionListDescription>

              {/* Aliases */}
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepReview.summaryTab.aliasesLabel"
                  defaultMessage="Aliases"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {getDescriptionText(serializedAliases)}
              </EuiDescriptionListDescription>

              {/* Metadata (optional) */}
              {isLegacy !== true && _meta && (
                <>
                  <EuiDescriptionListTitle data-test-subj="metaTitle">
                    <FormattedMessage
                      id="xpack.idxMgmt.templateForm.stepReview.summaryTab.metaLabel"
                      defaultMessage="Metadata"
                    />
                  </EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    <EuiCodeBlock lang="json">{JSON.stringify(_meta, null, 2)}</EuiCodeBlock>
                  </EuiDescriptionListDescription>
                </>
              )}
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );

    const RequestTab = () => {
      const esApiEndpoint = isLegacy ? '_template' : '_index_template';
      const endpoint = `PUT ${esApiEndpoint}/${name || '<templateName>'}`;
      const templateString = JSON.stringify(serializedTemplate, null, 2);
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
                id="xpack.idxMgmt.templateForm.stepReview.requestTab.descriptionText"
                defaultMessage="This request will create the following index template."
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
      <div data-test-subj="stepSummary">
        <EuiTitle>
          <h2 data-test-subj="stepTitle">
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepReview.stepTitle"
              defaultMessage="Review details for '{templateName}'"
              values={{ templateName: name }}
            />
          </h2>
        </EuiTitle>

        <EuiSpacer size="l" />

        {hasWildCardIndexPattern ? (
          <Fragment>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepReview.summaryTab.indexPatternsWarningTitle"
                  defaultMessage="This template uses a wildcard (*) as an index pattern."
                />
              }
              color="warning"
              iconType="help"
              data-test-subj="indexPatternsWarning"
            >
              <p data-test-subj="indexPatternsWarningDescription">
                <FormattedMessage
                  id="xpack.idxMgmt.templateForm.stepReview.summaryTab.indexPatternsWarningDescription"
                  defaultMessage="All new indices that you create will use this template."
                />{' '}
                {/* Edit link navigates back to step 1 (logistics) */}
                <EuiLink onClick={navigateToStep.bind(null, 'logistics')}>
                  <FormattedMessage
                    id="xpack.idxMgmt.templateForm.stepReview.summaryTab.indexPatternsWarningLinkText"
                    defaultMessage="Edit index patterns."
                  />
                </EuiLink>
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </Fragment>
        ) : null}

        <EuiTabbedContent
          data-test-subj="summaryTabContent"
          tabs={[
            {
              id: 'summary',
              name: i18n.translate('xpack.idxMgmt.templateForm.stepReview.summaryTabTitle', {
                defaultMessage: 'Summary',
              }),
              content: <SummaryTab />,
            },
            {
              id: 'request',
              name: i18n.translate('xpack.idxMgmt.templateForm.stepReview.requestTabTitle', {
                defaultMessage: 'Request',
              }),
              content: <RequestTab />,
            },
          ]}
        />
      </div>
    );
  }
);
