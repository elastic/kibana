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

import { PRECISION_DOCS_URL } from '../../../../routes';
import { RelevanceTuningLogic } from '../../relevance_tuning_logic';

import { STEP_DESCRIPTIONS } from './constants';

import './precision_slider.scss';

export const PrecisionSlider: React.FC = () => {
  const {
    searchSettings: { precision },
  } = useValues(RelevanceTuningLogic);

  const { setPrecision } = useActions(RelevanceTuningLogic);

  const stepDescription = STEP_DESCRIPTIONS[precision];

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
      <EuiText color="subdued">
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.description',
          {
            defaultMessage: 'Fine tune the precision vs. recall settings on your engine.',
          }
        )}{' '}
        <EuiLink data-test-subj="documentationLink" href={PRECISION_DOCS_URL} target="_blank">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.learnMore.link',
            {
              defaultMessage: 'Learn more.',
            }
          )}
        </EuiLink>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup justifyContent="spaceBetween" aria-hidden>
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
        aria-label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.precisionSlider.ariaLabel',
          { defaultMessage: 'Recall vs. precision' }
        )}
        data-test-subj="PrecisionRange"
        value={precision}
        onChange={(e) => {
          setPrecision(parseInt((e.target as HTMLInputElement).value, 10));
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
          <EuiPanel className="stepDescription" color="subdued" data-test-subj="StepDescription">
            {stepDescription}
          </EuiPanel>
        </>
      )}
    </>
  );
};
