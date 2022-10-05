/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { EnrichedFieldMetadata } from '../../../../types';

import * as i18n from '../../../index_properties/translations';
import { CalloutItem } from '../../styles';

interface Props {
  children?: React.ReactNode;
  enrichedFieldMetadata: EnrichedFieldMetadata[];
}

const NotEcsCompliantCalloutComponent: React.FC<Props> = ({ children, enrichedFieldMetadata }) => (
  <EuiCallOut
    color="danger"
    size="s"
    title={i18n.NOT_ECS_COMPLIANT_CALLOUT_TITLE(enrichedFieldMetadata.length)}
  >
    <div>{i18n.NOT_ECS_COMPLIANT_CALLOUT(enrichedFieldMetadata.length)}</div>
    <CalloutItem>{i18n.MAPPINGS_THAT_CONFLICT_WITH_ECS}</CalloutItem>
    <CalloutItem>{i18n.DETECTION_ENGINE_RULES_WONT_WORK}</CalloutItem>
    <CalloutItem>{i18n.PAGES_WONT_DISPLAY_EVENTS}</CalloutItem>
    <EuiSpacer size="s" />
    {children}
  </EuiCallOut>
);

NotEcsCompliantCalloutComponent.displayName = 'NotEcsCompliantCalloutComponent';

export const NotEcsCompliantCallout = React.memo(NotEcsCompliantCalloutComponent);
