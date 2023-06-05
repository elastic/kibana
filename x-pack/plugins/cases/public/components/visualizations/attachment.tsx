/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import deepEqual from 'fast-deep-equal';
import { LENS_ATTACHMENT_TYPE } from '../../../common/constants/visualizations';
import * as i18n from './translations';

import type {
  PersistableStateAttachmentType,
  PersistableStateAttachmentViewProps,
} from '../../client/attachment_framework/types';
import { AttachmentActionType } from '../../client/attachment_framework/types';
import type { LensProps } from './types';
import { OpenLensButton } from './open_lens_button';

function getOpenLensButton(attachmentId: string, props: LensProps) {
  return (
    <OpenLensButton
      attachmentId={attachmentId}
      attributes={props.attributes}
      timeRange={props.timeRange}
    />
  );
}

const getVisualizationAttachmentActions = (attachmentId: string, props: LensProps) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getOpenLensButton(attachmentId, props),
    isPrimary: false,
  },
];

const getVisualizationAttachmentViewObject = ({
  attachmentId,
  persistableStateAttachmentState,
}: PersistableStateAttachmentViewProps) => {
  const { attributes: lensAttributes, timeRange: lensTimeRange } =
    persistableStateAttachmentState as unknown as LensProps;

  return {
    event: 'added visualization',
    timelineAvatar: 'lensApp',
    getActions: () =>
      getVisualizationAttachmentActions(attachmentId, {
        attributes: lensAttributes,
        timeRange: lensTimeRange,
      }),
    hideDefaultActions: false,
    children: React.lazy(async () => {
      const { LensRenderer } = await import('./lens_renderer');

      return {
        // eslint-disable-next-line react/display-name
        default: React.memo(
          (props: PersistableStateAttachmentViewProps) => {
            const { attributes, timeRange } =
              props.persistableStateAttachmentState as unknown as LensProps;

            return <LensRenderer attributes={attributes} timeRange={timeRange} />;
          },
          (prevProps, nextProps) =>
            deepEqual(
              prevProps.persistableStateAttachmentState,
              nextProps.persistableStateAttachmentState
            )
        ),
      };
    }),
  };
};

export const getVisualizationAttachmentType = (): PersistableStateAttachmentType => ({
  id: LENS_ATTACHMENT_TYPE,
  icon: 'document',
  displayName: 'Visualizations',
  getAttachmentViewObject: getVisualizationAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_VISUALIZATION }),
});
