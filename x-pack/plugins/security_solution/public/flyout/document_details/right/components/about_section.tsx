/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandSection } from '../hooks/use_expand_section';
import { ExpandableSection } from './expandable_section';
import { ABOUT_SECTION_TEST_ID } from './test_ids';
import { AlertDescription } from './alert_description';
import { Reason } from './reason';
import { MitreAttack } from './mitre_attack';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';
import { useDocumentDetailsContext } from '../../shared/context';
import { isEcsAllowedValue } from '../utils/event_utils';
import { EventCategoryDescription } from './event_category_description';
import { EventKindDescription } from './event_kind_description';
import { EventRenderer } from './event_renderer';

const KEY = 'about';

/**
 * Most top section of the overview tab.
 * For alerts (event.kind is signal), it contains the description, reason and mitre attack information.
 * For generic events (event.kind is event), it shows the event category description and event renderer.
 * For all other events, it shows the event kind description, a list of event categories and event renderer.
 */
export const AboutSection = memo(() => {
  const { getFieldsData } = useDocumentDetailsContext();
  const eventKind = getField(getFieldsData('event.kind'));
  const eventKindInECS = eventKind && isEcsAllowedValue('event.kind', eventKind);

  const expanded = useExpandSection({ title: KEY, defaultValue: true });

  const content =
    eventKind === EventKind.signal ? (
      <>
        <AlertDescription />
        <Reason />
        <MitreAttack />
      </>
    ) : (
      <>
        {eventKindInECS &&
          (eventKind === 'event' ? (
            // if event kind is event, show a detailed description based on event category
            <EventCategoryDescription />
          ) : (
            // if event kind is not event, show a higher level description on event kind
            <EventKindDescription eventKind={eventKind} />
          ))}
        <EventRenderer />
      </>
    );

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.about.sectionTitle"
          defaultMessage="About"
        />
      }
      localStorageKey={KEY}
      gutterSize="s"
      data-test-subj={ABOUT_SECTION_TEST_ID}
    >
      {content}
    </ExpandableSection>
  );
});

AboutSection.displayName = 'AboutSection';
