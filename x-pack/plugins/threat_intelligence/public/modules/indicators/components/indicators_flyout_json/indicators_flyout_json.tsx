/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiCodeBlock, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Indicator } from '../../../../../common/types/indicator';

export const EMPTY_PROMPT_TEST_ID = 'tiFlyoutJsonEmptyPrompt';
export const CODE_BLOCK_TEST_ID = 'tiFlyoutJsonCodeBlock';

export interface IndicatorsFlyoutJsonProps {
  /**
   * Indicator to display in json format.
   */
  indicator: Indicator;
}

/**
 * Displays all the properties and values of an {@link Indicator} in json view,
 * using the {@link EuiCodeBlock} from the @elastic/eui library.
 */
export const IndicatorsFlyoutJson: VFC<IndicatorsFlyoutJsonProps> = ({ indicator }) => {
  return Object.keys(indicator).length === 0 ? (
    <EuiEmptyPrompt
      iconType="alert"
      color="danger"
      title={
        <h2>
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.flyoutJson.errorMessageTitle"
            defaultMessage="Unable to display indicator information"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.flyoutJson.errorMessageBody"
            defaultMessage="There was an error displaying the indicator fields and values."
          />
        </p>
      }
      data-test-subj={EMPTY_PROMPT_TEST_ID}
    />
  ) : (
    <EuiCodeBlock language="json" lineNumbers data-test-subj={CODE_BLOCK_TEST_ID}>
      {JSON.stringify(indicator, null, 2)}
    </EuiCodeBlock>
  );
};
