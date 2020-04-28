/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';

import { getAllFieldsByName, WithSource } from '../../containers/source';
import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { useKibana } from '../../lib/kibana';
import { createFilter } from '../page/add_filter_to_global_search_bar';
import { useTimelineContext } from '../timeline/timeline_context';
import { StatefulTopN } from '../top_n';

import { allowTopN } from './helpers';
import * as i18n from './translations';

interface Props {
  field: string;
  onFilterAdded?: () => void;
  showTopN: boolean;
  toggleTopN: () => void;
  value?: string[] | string | null;
}

const DraggableWrapperHoverContentComponent: React.FC<Props> = ({
  field,
  onFilterAdded,
  showTopN,
  toggleTopN,
  value,
}) => {
  const kibana = useKibana();
  const { filterManager: timelineFilterManager } = useTimelineContext();
  const filterManager = useMemo(() => kibana.services.data.query.filterManager, [
    kibana.services.data.query.filterManager,
  ]);

  const filterForValue = useCallback(() => {
    const filter =
      value?.length === 0 ? createFilter(field, undefined) : createFilter(field, value);
    const activeFilterManager = timelineFilterManager ?? filterManager;

    if (activeFilterManager != null) {
      activeFilterManager.addFilters(filter);

      if (onFilterAdded != null) {
        onFilterAdded();
      }
    }
  }, [field, value, timelineFilterManager, filterManager, onFilterAdded]);

  const filterOutValue = useCallback(() => {
    const filter =
      value?.length === 0 ? createFilter(field, null, false) : createFilter(field, value, true);
    const activeFilterManager = timelineFilterManager ?? filterManager;

    if (activeFilterManager != null) {
      activeFilterManager.addFilters(filter);

      if (onFilterAdded != null) {
        onFilterAdded();
      }
    }
  }, [field, value, timelineFilterManager, filterManager, onFilterAdded]);

  return (
    <>
      {!showTopN && value != null && (
        <EuiToolTip content={i18n.FILTER_FOR_VALUE}>
          <EuiButtonIcon
            aria-label={i18n.FILTER_FOR_VALUE}
            color="text"
            data-test-subj="filter-for-value"
            iconType="magnifyWithPlus"
            onClick={filterForValue}
          />
        </EuiToolTip>
      )}

      {!showTopN && value != null && (
        <EuiToolTip content={i18n.FILTER_OUT_VALUE}>
          <EuiButtonIcon
            aria-label={i18n.FILTER_OUT_VALUE}
            color="text"
            data-test-subj="filter-out-value"
            iconType="magnifyWithMinus"
            onClick={filterOutValue}
          />
        </EuiToolTip>
      )}

      <WithSource sourceId="default">
        {({ browserFields }) => (
          <>
            {allowTopN({
              browserField: getAllFieldsByName(browserFields)[field],
              fieldName: field,
            }) && (
              <>
                {!showTopN && (
                  <EuiToolTip content={i18n.SHOW_TOP(field)}>
                    <EuiButtonIcon
                      aria-label={i18n.SHOW_TOP(field)}
                      color="text"
                      data-test-subj="show-top-field"
                      iconType="visBarVertical"
                      onClick={toggleTopN}
                    />
                  </EuiToolTip>
                )}

                {showTopN && (
                  <StatefulTopN
                    browserFields={browserFields}
                    field={field}
                    onFilterAdded={onFilterAdded}
                    toggleTopN={toggleTopN}
                    value={value}
                  />
                )}
              </>
            )}
          </>
        )}
      </WithSource>

      {!showTopN && (
        <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
          <WithCopyToClipboard
            data-test-subj="copy-to-clipboard"
            text={`${field}${value != null ? `: "${value}"` : ''}`}
            titleSummary={i18n.FIELD}
          />
        </EuiToolTip>
      )}
    </>
  );
};

DraggableWrapperHoverContentComponent.displayName = 'DraggableWrapperHoverContentComponent';

export const DraggableWrapperHoverContent = React.memo(DraggableWrapperHoverContentComponent);
