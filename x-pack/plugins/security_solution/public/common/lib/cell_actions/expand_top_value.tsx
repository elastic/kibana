/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useMemo, useState, useCallback } from 'react';
import { Filter } from '../../../../../../../src/plugins/data/public';
import { BrowserFields } from '../../../../../timelines/common/search_strategy';
import { allowTopN } from '../../components/drag_and_drop/helpers';
import { ShowTopNButton } from '../../components/hover_actions/actions/show_top_n';
import { getAllFieldsByName } from '../../containers/source';

interface Props {
  browserFields: BrowserFields;
  field: string;
  globalFilters?: Filter[];
  timelineId: string;
  value: string[] | undefined;
  onFilterAdded?: () => void;
}

const ExpandTopValueComponent: React.FC<Props> = ({
  browserFields,
  field,
  globalFilters,
  onFilterAdded,
  timelineId,
  value,
}) => {
  const showButton = useMemo(
    () =>
      allowTopN({
        browserField: getAllFieldsByName(browserFields)[field],
        fieldName: field,
        hideTopN: false,
      }),
    [browserFields, field]
  );

  const [showTopN, setShowTopN] = useState(false);
  const onClick = useCallback(() => setShowTopN(!showTopN), [showTopN]);

  return showButton ? (
    <ShowTopNButton
      className="eui-displayBlock expandable-top-value-button"
      Component={EuiButtonEmpty}
      data-test-subj="data-grid-expanded-show-top-n"
      field={field}
      flush="both"
      globalFilters={globalFilters}
      iconSide="right"
      iconType="arrowDown"
      isExpandable
      onClick={onClick}
      onFilterAdded={onFilterAdded ?? noop}
      ownFocus={false}
      showTopN={showTopN}
      showTooltip={false}
      timelineId={timelineId}
      value={value}
    />
  ) : null;
};

ExpandTopValueComponent.displayName = 'ExpandTopValueComponent';

export const ExpandTopValue = React.memo(ExpandTopValueComponent);
