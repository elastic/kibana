/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import deepEqual from 'fast-deep-equal';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { LENS_ATTACHMENT_TYPE } from '../../../common/constants/visualizations';
import * as i18n from './translations';

import type {
  PersistableStateAttachmentType,
  PersistableStateAttachmentViewProps,
} from '../../client/attachment_framework/types';

const getFileAttachmentViewObject = () => {
  return {
    event: 'added visualization',
    timelineAvatar: 'lensApp',
    // getActions: () => getFileAttachmentActions({ caseId, fileId }),
    hideDefaultActions: false,
    children: React.lazy(async () => {
      const { LensRenderer } = await import('./lens_renderer');

      return {
        // eslint-disable-next-line react/display-name
        default: React.memo(
          (props: PersistableStateAttachmentViewProps) => {
            const { attributes, timeRange } =
              props.persistableStateAttachmentState as unknown as Pick<
                TypedLensByValueInput,
                'attributes' | 'timeRange'
              >;

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
  getAttachmentViewObject: getFileAttachmentViewObject,
  getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_VISUALIZATION }),
});
