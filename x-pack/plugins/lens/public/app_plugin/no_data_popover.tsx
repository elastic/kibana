/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState } from 'react';
import React from 'react';
import { EuiButtonEmpty, EuiText, EuiTourStepProps } from '@elastic/eui';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { i18n } from '@kbn/i18n';

const NO_DATA_POPOVER_STORAGE_KEY = 'xpack.lens.noDataPopover';

export function useNoDataPopover(
  storage: IStorageWrapper
): [Omit<EuiTourStepProps, 'children'> | undefined, () => void] {
  const [noDataPopoverDismissed, setNoDataPopoverDismissed] = useState(() =>
    Boolean(storage.get(NO_DATA_POPOVER_STORAGE_KEY))
  );
  const [noDataPopoverVisible, setNoDataPopoverVisible] = useState(false);

  const showNoDataPopover = useCallback(() => {
    if (!noDataPopoverDismissed) {
      setNoDataPopoverVisible(true);
    }
  }, []);

  const noDataPopoverVisibleProps:
    | Omit<EuiTourStepProps, 'children'>
    | undefined = noDataPopoverVisible
    ? {
        onFinish: () => {},
        closePopover: () => {
          setNoDataPopoverVisible(false);
        },
        content: (
          <EuiText size="s">
            <p style={{ maxWidth: 300 }}>
              {i18n.translate('lens.noDataPopover.content', {
                defaultMessage:
                  "This time range doesn't contain any data for this index pattern. Increase or adjust the time range to see more fields and create charts",
              })}
            </p>
          </EuiText>
        ),
        minWidth: 300,
        anchorPosition: 'downCenter',
        step: 1,
        stepsTotal: 1,
        isStepOpen: true,
        subtitle: i18n.translate('lens.noDataPopover.title', { defaultMessage: 'Lens tip' }),
        title: '',
        footerAction: (
          <EuiButtonEmpty
            size="s"
            onClick={() => {
              storage.set(NO_DATA_POPOVER_STORAGE_KEY, true);
              setNoDataPopoverDismissed(true);
              setNoDataPopoverVisible(false);
            }}
          >
            {i18n.translate('lens.noDataPopover.dismissAction', {
              defaultMessage: "Don't show again",
            })}
          </EuiButtonEmpty>
        ),
      }
    : undefined;

  return [noDataPopoverVisibleProps, showNoDataPopover];
}
