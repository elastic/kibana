/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesUiSetup } from '@kbn/cases-plugin/public/types';
import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import type { PersistableStateAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import type { CoreStart } from '@kbn/core/public';
import { getAnomalySwimLaneEmbeddableComponent } from '../embeddables/anomaly_swimlane';
import type { MlStartDependencies } from '../plugin';
import { PLUGIN_ICON } from '../../common/constants/app';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, AnomalySwimlaneEmbeddableInput } from '../embeddables';

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

export function registerCasesAttachment(
  cases: CasesUiSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  cases.attachmentFramework.registerPersistableState({
    id: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
    icon: PLUGIN_ICON,
    displayName: 'Test',
    getAttachmentViewObject: () => ({
      event: 'added an embeddable',
      timelineIcon: PLUGIN_ICON,
      actions: <AttachmentActions />,
      children: React.lazy(() => {
        return Promise.resolve().then(() => {
          const EmbeddableComponent = getAnomalySwimLaneEmbeddableComponent(coreStart, pluginStart);

          return {
            default: React.memo((props: PersistableStateAttachmentViewProps) => {
              const { persistableStateAttachmentState } = props;

              const inputProps =
                persistableStateAttachmentState as unknown as AnomalySwimlaneEmbeddableInput;

              return <EmbeddableComponent {...inputProps} />;
            }),
          };
        });
      }),
    }),
  });
}
