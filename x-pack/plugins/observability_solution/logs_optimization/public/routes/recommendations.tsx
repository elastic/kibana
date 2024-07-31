/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiButton,
  EuiCode,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import { FieldName } from '@kbn/fields-metadata-plugin/common';
import { useParams } from 'react-router-dom';
import { createRenameProcessor } from '../../common/pipeline_utils';
import { Recommendation } from '../../common/recommendations';
import { LogsOptimizationPageTemplate } from '../components/page_template';
import { noBreadcrumbs, useBreadcrumbs } from '../utils/breadcrumbs';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { ApplyRecommendationHandler } from '../hooks/use_recommendations';

export const RecommendationsRoute = () => {
  const { services } = useKibanaContextForPlugin();
  const { useRecommendations, serverless, chrome } = services;

  const { dataStream } = useParams<{ dataStream: string }>();
  useBreadcrumbs(noBreadcrumbs, chrome, serverless);

  const { recommendations, loading, error, applyRecommendation } = useRecommendations(
    { dataStream },
    [dataStream]
  );

  return (
    <LogsOptimizationPageTemplate
      restrictWidth
      pageHeader={{
        pageTitle: `Logs optimizations for ${dataStream}`,
      }}
    >
      <EuiSpacer size="xxl" />
      {Boolean(loading && !recommendations) && 'Loading...'}
      {error && error.message}
      {recommendations?.map((recommendation) => {
        const recommendationToComponentMap: Record<
          Recommendation['type'],
          React.FunctionComponent<{
            recommendation: Recommendation;
            onApplyRecommendation: ApplyRecommendationHandler;
          }>
        > = {
          mapping_gap: MappingGapRecommendation,
          field_extraction: FieldExtractionRecommendation,
          json_parsing: JSONParsingRecommendation,
        };

        const RecommendationComponent = recommendationToComponentMap[recommendation.type];

        return (
          <Fragment key={recommendation.id}>
            <RecommendationComponent
              recommendation={recommendation}
              onApplyRecommendation={applyRecommendation}
            />
            <EuiSpacer size="m" />
          </Fragment>
        );
      })}
    </LogsOptimizationPageTemplate>
  );
};

const FieldExtractionRecommendation = ({
  recommendation,
  onApplyRecommendation,
}: {
  recommendation: Recommendation;
  onApplyRecommendation: ApplyRecommendationHandler;
}) => {
  const { services } = useKibanaContextForPlugin();
  const { usePipelineSimulator } = services;

  const { simulation, simulate } = usePipelineSimulator();

  const simulationStr = JSON.stringify(
    simulation?.docs[0]?.processor_results.at(-1).doc._source,
    null,
    2
  );

  const [pipeline, setPipeline] = useState(() =>
    JSON.stringify(recommendation.detection.tasks.processors, null, 2)
  );
  const [docSample, setDocSample] = useState(() =>
    JSON.stringify(recommendation.detection.documentSamples[0]._source, null, 2)
  );

  const simulateRecommendedPipeline = () => {
    simulate({
      processors: JSON.parse(pipeline),
      docs: [{ _source: JSON.parse(docSample) }],
    });
  };

  const accordionTriggerButton = (
    <EuiTitle size="xs">
      <h3>
        {i18n.translate('app_not_found_in_i18nrc.extractionRecommendation.extractLabel', {
          defaultMessage: 'Extract {targetField} from {sourceField}',
          values: {
            targetField: (
              <EuiCode key="targetField">{recommendation.detection.targetField}</EuiCode>
            ),
            sourceField: (
              <EuiCode key="sourceField">{recommendation.detection.sourceField}</EuiCode>
            ),
          },
        })}
      </h3>
    </EuiTitle>
  );

  const isResolved = recommendation.status === 'resolved';

  const extraAction = (
    <EuiButton
      onClick={() =>
        onApplyRecommendation(recommendation.id, {
          dataStream: recommendation.dataStream,
          tasks: {
            processors: JSON.parse(pipeline),
          },
        })
      }
      disabled={isResolved}
      color={isResolved ? 'success' : 'primary'}
      data-test-subj="logsOptimizationFieldExtractionRecommendationApplyRecommendationButton"
    >
      {isResolved
        ? i18n.translate(
            'app_not_found_in_i18nrc.fieldExtractionRecommendation.applyRecommendationButtonLabelResolved',
            { defaultMessage: 'Applied!' }
          )
        : i18n.translate(
            'app_not_found_in_i18nrc.fieldExtractionRecommendation.applyRecommendationButtonLabel',
            { defaultMessage: 'Apply recommendation' }
          )}
    </EuiButton>
  );

  return (
    <EuiPanel>
      <EuiAccordion
        id={recommendation.type + recommendation.created_at}
        buttonContent={accordionTriggerButton}
        extraAction={extraAction}
        initialIsOpen={!isResolved}
      >
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={4}>
            <EuiText>
              {i18n.translate(
                'app_not_found_in_i18nrc.fieldExtractionRecommendation.weCanExtractLoglevelsAccordionLabel',
                {
                  defaultMessage:
                    'We can extract the {targetField} field from this dataStream {sourceField} field.',
                  values: {
                    targetField: (
                      <EuiCode key="targetField">{recommendation.detection.targetField}</EuiCode>
                    ),
                    sourceField: (
                      <EuiCode key="sourceField">{recommendation.detection.sourceField}</EuiCode>
                    ),
                  },
                }
              )}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText>
              {i18n.translate(
                'app_not_found_in_i18nrc.fieldExtractionRecommendation.youCanSimulateTheTextLabel',
                {
                  defaultMessage:
                    'You can simulate the proposed pipeline processors to extract the data and ensure accuracy. In the future, logs will be ingested using these pipeline processors during logs ingestion:',
                }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <CodeEditor
              languageId="json"
              value={pipeline}
              onChange={setPipeline}
              height={300}
              options={{ lineNumbers: 'off' }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiTitle size="xs">
          <h4>
            {i18n.translate(
              'app_not_found_in_i18nrc.fieldExtractionRecommendation.h4.changesSimulationLabel',
              { defaultMessage: 'Changes simulation' }
            )}
          </h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={3}>
            <CodeEditor
              languageId="json"
              value={docSample}
              onChange={setDocSample}
              height={300}
              options={{ lineNumbers: 'off' }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiButton
              onClick={simulateRecommendedPipeline}
              data-test-subj="logsOptimizationFieldExtractionRecommendationSimulateButton"
            >
              {i18n.translate(
                'app_not_found_in_i18nrc.fieldExtractionRecommendation.simulateButtonLabel',
                { defaultMessage: 'Simulate pipeline' }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <CodeEditor
              languageId="json"
              value={simulationStr}
              height={300}
              options={{ lineNumbers: 'off', readOnly: true }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  );
};

const JSONParsingRecommendation = ({
  recommendation,
  onApplyRecommendation,
}: {
  recommendation: Recommendation;
  onApplyRecommendation: ApplyRecommendationHandler;
}) => {
  const { services } = useKibanaContextForPlugin();
  const { usePipelineSimulator } = services;

  const { simulation, simulate } = usePipelineSimulator();

  const simulationStr = JSON.stringify(
    simulation?.docs[0]?.processor_results.at(-1).doc._source,
    null,
    2
  );

  const [pipeline, setPipeline] = useState(() =>
    JSON.stringify(recommendation.detection.tasks.processors, null, 2)
  );
  const [docSample, setDocSample] = useState(() =>
    JSON.stringify(recommendation.detection.documentSamples[0]._source, null, 2)
  );

  const simulateRecommendedPipeline = () => {
    simulate({
      processors: JSON.parse(pipeline),
      docs: [{ _source: JSON.parse(docSample) }],
    });
  };

  const accordionTriggerButton = (
    <EuiTitle size="xs">
      <h3>
        {i18n.translate(
          'app_not_found_in_i18nrc.jSONParsingRecommendation.h3.parseTheSourceFieldFieldLabel',
          {
            defaultMessage: 'Parse the {sourceField} field JSON content',
            values: {
              sourceField: <EuiCode>{recommendation.detection.sourceField}</EuiCode>,
            },
          }
        )}
      </h3>
    </EuiTitle>
  );

  const isResolved = recommendation.status === 'resolved';

  const extraAction = (
    <EuiButton
      onClick={() =>
        onApplyRecommendation(recommendation.id, {
          dataStream: recommendation.dataStream,
          tasks: {
            processors: JSON.parse(pipeline),
          },
        })
      }
      disabled={isResolved}
      color={isResolved ? 'success' : 'primary'}
      data-test-subj="logsOptimizationJsonParsingRecommendationApplyRecommendationButton"
    >
      {isResolved
        ? i18n.translate(
            'app_not_found_in_i18nrc.jsonParsingRecommendation.applyRecommendationButtonLabelResolved',
            { defaultMessage: 'Applied!' }
          )
        : i18n.translate(
            'app_not_found_in_i18nrc.jsonParsingRecommendation.applyRecommendationButtonLabel',
            { defaultMessage: 'Apply recommendation' }
          )}
    </EuiButton>
  );

  return (
    <EuiPanel>
      <EuiAccordion
        id={recommendation.type + recommendation.created_at}
        buttonContent={accordionTriggerButton}
        extraAction={extraAction}
        initialIsOpen={!isResolved}
      >
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={4}>
            <EuiText>
              {i18n.translate(
                'app_not_found_in_i18nrc.fieldExtractionRecommendation.weCanExtractLoglevelsAccordionLabel',
                {
                  defaultMessage:
                    'We can parse the {sourceField} field content from this dataStream, as it seems to be in JSON format.',
                  values: {
                    targetField: <EuiCode>{recommendation.detection.targetField}</EuiCode>,
                    sourceField: <EuiCode>{recommendation.detection.sourceField}</EuiCode>,
                  },
                }
              )}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiText>
              {i18n.translate(
                'app_not_found_in_i18nrc.fieldExtractionRecommendation.youCanSimulateTheTextLabel',
                {
                  defaultMessage:
                    'You can simulate the proposed pipeline processors to extract the data and ensure accuracy. In the future, logs will be ingested using these pipeline processors during logs ingestion:',
                }
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <CodeEditor
              languageId="json"
              value={pipeline}
              onChange={setPipeline}
              height={300}
              options={{ lineNumbers: 'off' }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiTitle size="xs">
          <h4>
            {i18n.translate(
              'app_not_found_in_i18nrc.fieldExtractionRecommendation.h4.changesSimulationLabel',
              { defaultMessage: 'Changes simulation' }
            )}
          </h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={3}>
            <CodeEditor
              languageId="json"
              value={docSample}
              onChange={setDocSample}
              height={300}
              options={{ lineNumbers: 'off' }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiButton
              onClick={simulateRecommendedPipeline}
              data-test-subj="logsOptimizationFieldExtractionRecommendationSimulateButton"
            >
              {i18n.translate(
                'app_not_found_in_i18nrc.fieldExtractionRecommendation.simulateButtonLabel',
                { defaultMessage: 'Simulate pipeline' }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <CodeEditor
              languageId="json"
              value={simulationStr}
              height={300}
              options={{ lineNumbers: 'off', readOnly: true }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  );
};

const MappingGapRecommendation = ({
  recommendation,
  onApplyRecommendation,
}: {
  recommendation: Recommendation;
  onApplyRecommendation: ApplyRecommendationHandler;
}) => {
  const { services } = useKibanaContextForPlugin();
  const {
    fieldsMetadata: { useFieldsMetadata },
  } = services;

  const { fieldsMetadata = {} } = useFieldsMetadata({ attributes: ['flat_name', 'type', 'short'] });

  const options: Array<EuiComboBoxOptionOption<FieldName>> = useMemo(
    () =>
      Object.values(fieldsMetadata).map((field) => ({
        label: field.flat_name!,
        value: field.flat_name,
        toolTipContent: field.short,
      })),
    [fieldsMetadata]
  );

  const [selectedECSFieldsMap, setSelectedECSFieldsMap] = useState(() =>
    recommendation.detection.gaps.reduce((gapsMap, gap) => {
      gapsMap[gap.field] = [];

      return gapsMap;
    }, {})
  );

  useEffect(() => {
    if (options.length > 0) {
      setSelectedECSFieldsMap((prev) => {
        return recommendation.detection.gaps.reduce(
          (gapsMap, gap) => {
            gapsMap[gap.field] = gap.target_field
              ? [options.find((option) => option.value === gap.target_field)]
              : [];

            return gapsMap;
          },
          { ...prev }
        );
      });
    }
  }, [options, recommendation.detection.gaps]);

  const [pipeline, setPipeline] = useState(recommendation.detection.tasks.processors);

  const handleSelectionChange = (selectedOptions, gap) => {
    const updatedECSFieldsMap = { ...selectedECSFieldsMap, [gap.field]: selectedOptions };
    const updatedPipeline = Object.entries(updatedECSFieldsMap)
      .filter(([_field, selectedOptions]) => selectedOptions?.length > 0)
      .map(([field, selectedOptions]) =>
        createRenameProcessor({ field, target_field: selectedOptions.at(0).value })
      );

    setSelectedECSFieldsMap(updatedECSFieldsMap);
    setPipeline(updatedPipeline);
  };

  const accordionTriggerButton = (
    <EuiTitle size="xs">
      <h3>
        {i18n.translate(
          'app_not_found_in_i18nrc.mappingGapRecommendation.h3.adjustMappingToBeLabel',
          { defaultMessage: 'Adjust mapping to be ECS compliant' }
        )}
      </h3>
    </EuiTitle>
  );

  const isResolved = recommendation.status === 'resolved';

  const extraAction = (
    <EuiButton
      onClick={() =>
        onApplyRecommendation(recommendation.id, {
          dataStream: recommendation.dataStream,
          tasks: {
            processors: pipeline,
          },
        })
      }
      disabled={isResolved}
      color={isResolved ? 'success' : 'primary'}
      data-test-subj="logsOptimizationMappingGapRecommendationApplyRecommendationButton"
    >
      {isResolved
        ? i18n.translate(
            'app_not_found_in_i18nrc.mappingGapRecommendation.applyRecommendationButtonLabelResolved',
            { defaultMessage: 'Applied!' }
          )
        : i18n.translate(
            'app_not_found_in_i18nrc.mappingGapRecommendation.applyRecommendationButtonLabel',
            { defaultMessage: 'Apply recommendation' }
          )}
    </EuiButton>
  );

  return (
    <EuiPanel>
      <EuiAccordion
        id={recommendation.type + recommendation.created_at}
        buttonContent={accordionTriggerButton}
        extraAction={extraAction}
        initialIsOpen={!isResolved}
      >
        <EuiSpacer size="m" />
        <EuiText>
          {i18n.translate(
            'app_not_found_in_i18nrc.mappingGapRecommendation.weDetectedSomeFieldsTextLabel',
            {
              defaultMessage:
                'We detected some fields are not compliant with the Elastic Common Schema.',
            }
          )}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText>
          {i18n.translate(
            'app_not_found_in_i18nrc.mappingGapRecommendation.youCanSearchAndTextLabel',
            {
              defaultMessage:
                "You can search and assign the fields that best suits your data, we'll take care of updating them with a ingest pipeline.",
            }
          )}
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={4}>
            <EuiFlexGroup direction="column">
              {recommendation.detection.gaps.map((gap) => (
                <EuiFlexItem grow={false} key={gap.field}>
                  <EuiFlexGroup alignItems="center">
                    <EuiFieldText
                      data-test-subj="logsOptimizationMappingGapRecommendationFieldText"
                      value={gap.field}
                      readOnly
                    />
                    <EuiText>
                      <strong>⇒</strong>
                    </EuiText>
                    <EuiComboBox
                      aria-label={i18n.translate(
                        'app_not_found_in_i18nrc.mappingGapRecommendation.euiComboBox.accessibleScreenReaderLabelLabel',
                        { defaultMessage: 'Select a field...' }
                      )}
                      placeholder="Select a field..."
                      singleSelection={{ asPlainText: true }}
                      options={options}
                      selectedOptions={selectedECSFieldsMap[gap.field]}
                      onChange={(selectedOpts) => handleSelectionChange(selectedOpts, gap)}
                    />
                  </EuiFlexGroup>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={3}>
            <CodeEditor
              languageId="json"
              value={JSON.stringify(pipeline, null, 2)}
              onChange={setPipeline}
              fitToContent={{
                minLines: 10,
                maxLines: 20,
              }}
              options={{ lineNumbers: 'off' }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiAccordion>
    </EuiPanel>
  );
};
