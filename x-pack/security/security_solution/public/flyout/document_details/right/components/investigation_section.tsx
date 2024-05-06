/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExpandableSection } from './expandable_section';
import { HighlightedFields } from './highlighted_fields';
import { INVESTIGATION_SECTION_TEST_ID } from './test_ids';
import { InvestigationGuide } from './investigation_guide';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { useRightPanelContext } from '../context';

export interface DescriptionSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Second section of the overview tab in details flyout.
 * It contains investigation guide (alerts only) and highlighted fields
 */
export const InvestigationSection: VFC<DescriptionSectionProps> = ({ expanded = true }) => {
  const { getFieldsData } = useRightPanelContext();
  const eventKind = getField(getFieldsData('event.kind'));

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.investigation.sectionTitle"
          defaultMessage="Investigation"
        />
      }
      data-test-subj={INVESTIGATION_SECTION_TEST_ID}
      gutterSize="s"
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
};

InvestigationSection.displayName = 'InvestigationSection';
