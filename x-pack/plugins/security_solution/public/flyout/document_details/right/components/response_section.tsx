/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ResponseButton } from './response_button';
import { ExpandableSection } from './expandable_section';
import { useRightPanelContext } from '../context';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { RESPONSE_SECTION_TEST_ID } from './test_ids';

export interface ResponseSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Most bottom section of the overview tab. It contains a summary of the response tab.
 */
export const ResponseSection: VFC<ResponseSectionProps> = ({ expanded = false }) => {
  const { isPreview, getFieldsData } = useRightPanelContext();
  const eventKind = getField(getFieldsData('event.kind'));
  if (eventKind !== EventKind.signal) {
    return null;
  }

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.response.sectionTitle"
          defaultMessage="Response"
        />
      }
      data-test-subj={RESPONSE_SECTION_TEST_ID}
    >
      {isPreview ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.response.previewMessage"
          defaultMessage="Response is not available in alert preview."
        />
      ) : (
        <ResponseButton />
      )}
    </ExpandableSection>
  );
};

ResponseSection.displayName = 'ResponseSection';
