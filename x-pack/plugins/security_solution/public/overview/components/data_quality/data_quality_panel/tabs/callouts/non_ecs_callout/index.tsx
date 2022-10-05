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

const NonEcsCalloutComponent: React.FC<Props> = ({ children, enrichedFieldMetadata }) => (
  <EuiCallOut
    color="warning"
    size="s"
    title={i18n.NON_ECS_CALLOUT_TITLE(enrichedFieldMetadata.length)}
  >
    <div>{i18n.NON_ECS_CALLOUT(enrichedFieldMetadata.length)}</div>
    <CalloutItem>{i18n.PRE_BUILT_DETECTION_ENGINE_RULES_WONT_WORK}</CalloutItem>
    <CalloutItem>{i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}</CalloutItem>
    <CalloutItem>{i18n.TIMELINE_AND_TEMPLATES_MAY_NOT_OPERATE_PROPERLY}</CalloutItem>
    <CalloutItem>{i18n.CUSTOM_DETECTION_ENGINE_RULES_WORK}</CalloutItem>
    <EuiSpacer size="s" />
    {children}
  </EuiCallOut>
);

NonEcsCalloutComponent.displayName = 'NonEcsCalloutComponent';

export const NonEcsCallout = React.memo(NonEcsCalloutComponent);
