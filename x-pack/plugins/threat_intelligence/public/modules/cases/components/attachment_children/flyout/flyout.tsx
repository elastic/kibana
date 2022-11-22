/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AttachmentMetadata } from '../../../utils';
import { DateFormatter } from '../../../../../components/date_formatter/date_formatter';
import { CasesFlyoutJson } from '../json';

export const TITLE_TEST_ID = 'tiCasesFlyoutTitle';
export const SUBTITLE_TEST_ID = 'tiCasesFlyoutSubtitle';

export interface CasesFlyoutProps {
  /**
   * Metadata saved in the case attachment (indicator)
   */
  metadata: AttachmentMetadata;
  /**
   * Document (indicator) retrieve by id
   */
  rawDocument: Record<string, unknown>;
  /**
   * Event to close flyout (used by {@link EuiFlyout}).
   */
  closeFlyout: () => void;
}

/**
 * Leverages the {@link EuiFlyout} from the @elastic/eui library to dhow the details of a specific {@link Indicator}.
 */
export const CasesFlyout: VFC<CasesFlyoutProps> = ({ metadata, rawDocument, closeFlyout }) => {
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 data-test-subj={TITLE_TEST_ID} id={flyoutTitleId}>
            <FormattedMessage
              id="xpack.threatIntelligence.cases.flyout.title"
              defaultMessage="Indicator details"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size={'xs'}>
          <p data-test-subj={SUBTITLE_TEST_ID}>
            <FormattedMessage
              id="xpack.threatIntelligence.cases.flyout.subTitle"
              defaultMessage="First seen: "
            />
            <DateFormatter date={metadata.indicatorFirstSeen} />
          </p>
        </EuiText>
        <EuiSpacer size="m" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <CasesFlyoutJson rawDocument={rawDocument} metadata={metadata} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter />
    </EuiFlyout>
  );
};
