/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesUiSetup } from '@kbn/cases-plugin/public/types';
import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { PLUGIN_ICON } from '../../common/constants/app';
import { EmbeddableSwimLaneContainer } from '../embeddables/anomaly_swimlane/embeddable_swim_lane_container_lazy';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../embeddables';

const AttachmentActions: React.FC = () => {
  return (
    <EuiButtonIcon
      data-test-subj="test-attachment-action"
      onClick={() => {}}
      iconType="arrowRight"
      aria-label="See attachment"
    />
  );
};

export function registerCasesAttachment(cases: CasesUiSetup) {
  cases.attachmentFramework.registerPersistableState({
    id: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    icon: PLUGIN_ICON,
    displayName: 'Test',
    getAttachmentViewObject: () => ({
      type: 'regular',
      event: 'added an embeddable',
      timelineIcon: 'machineLearningApp',
      actions: <AttachmentActions />,
      children: <EmbeddableSwimLaneContainer />,
    }),
  });
}
