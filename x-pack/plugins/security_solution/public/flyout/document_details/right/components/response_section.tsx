/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandSection } from '../hooks/use_expand_section';
import { ResponseButton } from './response_button';
import { ExpandableSection } from './expandable_section';
import { useRightPanelContext } from '../context';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { RESPONSE_SECTION_TEST_ID } from './test_ids';

const KEY = 'response';

/**
 * Most bottom section of the overview tab. It contains a summary of the response tab.
 */
export const ResponseSection: FC = memo(() => {
  const { isPreview, getFieldsData } = useRightPanelContext();

  const expanded = useExpandSection({ title: KEY, defaultValue: false });

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
      localStorageKey={KEY}
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
});

ResponseSection.displayName = 'ResponseSection';
