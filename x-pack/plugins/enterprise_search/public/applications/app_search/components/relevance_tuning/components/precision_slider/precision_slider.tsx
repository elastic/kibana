/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiRange,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DOCS_PREFIX } from '../../../../routes';
import { RelevanceTuningLogic } from '../../relevance_tuning_logic';

import { getStepDescription } from './utils';

export const PrecisionSlider: React.FC = () => {
  const {
    searchSettings: { precision },
  } = useValues(RelevanceTuningLogic);

  const { updatePrecision } = useActions(RelevanceTuningLogic);

  const stepDescription = getStepDescription(precision);

  return (
    <>
      <EuiTitle size="m">
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.title',
            {
              defaultMessage: 'Precision tuning',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiSpacer />
      <EuiPanel hasShadow={false} paddingSize="none">
        <EuiText color="subdued">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.description',
            {
              defaultMessage: 'Fine tune the precision vs. recall settings on your engine.',
            }
          )}{' '}
          <EuiLink href={`${DOCS_PREFIX}/api-reference.html`} target="_blank">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.learnMore.link',
              {
                defaultMessage: 'Learn more.',
              }
            )}
          </EuiLink>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <strong>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.recall.label',
                {
                  defaultMessage: 'Recall',
                }
              )}
            </strong>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <strong>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.precision.label',
                {
                  defaultMessage: 'Precision',
                }
              )}
            </strong>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiRange
          data-test-subj="PrecisionRange"
          value={precision}
          onChange={(e) => {
            updatePrecision(parseInt((e.target as HTMLInputElement).value, 10));
          }}
          min={1}
          max={11}
          step={1}
          showRange
          showTicks
          fullWidth
        />
        {stepDescription && (
          <>
            <EuiSpacer size="s" />
            <EuiPanel
              color="subdued"
              data-test-subj="StepDescription"
              style={{ minHeight: '4.7143rem' }}
            >
              {stepDescription}
            </EuiPanel>
          </>
        )}
      </EuiPanel>
    </>
  );
};
