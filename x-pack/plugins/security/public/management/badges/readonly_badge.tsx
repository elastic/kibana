/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { useBadge } from '../../components/use_badge';
import { useCapabilities } from '../../components/use_capabilities';

export interface ReadonlyBadgeProps {
  featureId: string;
  tooltip: string;
}

export const ReadonlyBadge = ({ featureId, tooltip }: ReadonlyBadgeProps) => {
  const { save } = useCapabilities(featureId);
  useBadge(
    save
      ? undefined
      : {
          iconType: 'glasses',
          text: i18n.translate('xpack.security.management.readonlyBadge.text', {
            defaultMessage: 'Read only',
          }),
          tooltip,
        },
    [save]
  );
  return null;
};
