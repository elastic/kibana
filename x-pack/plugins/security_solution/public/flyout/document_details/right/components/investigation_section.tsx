/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandSection } from '../hooks/use_expand_section';
import { ExpandableSection } from './expandable_section';
import { HighlightedFields } from './highlighted_fields';
import { INVESTIGATION_SECTION_TEST_ID } from './test_ids';
import { InvestigationGuide } from './investigation_guide';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { useDocumentDetailsContext } from '../../shared/context';

const KEY = 'investigation';

/**
 * Second section of the overview tab in details flyout.
 * It contains investigation guide (alerts only) and highlighted fields
 */
export const InvestigationSection = memo(() => {
  const { getFieldsData } = useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));

  const expanded = useExpandSection({ title: KEY, defaultValue: true });

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.investigation.sectionTitle"
          defaultMessage="Investigation"
        />
      }
      localStorageKey={KEY}
      gutterSize="s"
      data-test-subj={INVESTIGATION_SECTION_TEST_ID}
    >
      {eventKind === EventKind.signal && (
        <>
          <InvestigationGuide />
          <EuiSpacer size="s" />
        </>
      )}
      <HighlightedFields />
    </ExpandableSection>
  );
});

InvestigationSection.displayName = 'InvestigationSection';
