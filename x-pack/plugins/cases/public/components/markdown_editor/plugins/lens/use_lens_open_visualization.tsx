/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useKibana } from '../../../../common/lib/kibana';
import {
  parseCommentString,
  getLensVisualizations,
} from '../../../../../common/utils/markdown_plugins/utils';

export const useLensOpenVisualization = ({ comment }: { comment: string }) => {
  const parsedComment = parseCommentString(comment);
  const lensVisualization = getLensVisualizations(parsedComment?.children ?? []);

  const {
    lens: { navigateToPrefilledEditor, canUseEditor },
  } = useKibana().services;

  const handleClick = useCallback(() => {
    navigateToPrefilledEditor(
      {
        id: '',
        timeRange: lensVisualization[0].timeRange,
        attributes: lensVisualization[0]
          .attributes as unknown as TypedLensByValueInput['attributes'],
      },
      {
        openInNewTab: true,
      }
    );
  }, [lensVisualization, navigateToPrefilledEditor]);

  return {
    canUseEditor: canUseEditor(),
    actionConfig: !lensVisualization.length
      ? null
      : {
          iconType: 'lensApp',
          label: i18n.translate(
            'xpack.cases.markdownEditor.plugins.lens.openVisualizationButtonLabel',
            {
              defaultMessage: 'Open visualization',
            }
          ),
          onClick: handleClick,
        },
  };
};
