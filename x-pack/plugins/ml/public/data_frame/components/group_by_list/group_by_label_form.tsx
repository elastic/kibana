/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPopover, EuiTextColor } from '@elastic/eui';

import { groupByConfigHasInterval, PivotGroupByConfig } from '../../common';

import { PopoverForm } from './popover_form';

interface Props {
  item: PivotGroupByConfig;
  optionsDataId: string;
  deleteHandler(l: string): void;
  onChange(id: string, item: PivotGroupByConfig): void;
}

export const GroupByLabelForm: React.SFC<Props> = ({
  deleteHandler,
  item,
  onChange,
  optionsDataId,
}) => {
  const [isPopoverVisible, setPopoverVisibility] = useState(false);

  function updateInterval(interval: string) {
    if (groupByConfigHasInterval(item)) {
      item.interval = interval;
      onChange(optionsDataId, item);
      setPopoverVisibility(false);
    }
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem className="mlGroupByLabel--text">
        <span className="mlGroupByLabel__text">{optionsDataId}</span>
      </EuiFlexItem>
      {groupByConfigHasInterval(item) && (
        <Fragment>
          <EuiFlexItem grow={false} className="mlGroupByLabel--text mlGroupByLabel--interval">
            <EuiTextColor color="subdued" className="mlGroupByLabel__text">
              {item.interval}
            </EuiTextColor>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="mlGroupByLabel--button">
            <EuiPopover
              id="mlIntervalFormPopover"
              ownFocus
              button={
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.ml.dataframe.groupByLabelForm.editIntervalAriaLabel',
                    {
                      defaultMessage: 'Edit interval',
                    }
                  )}
                  size="s"
                  iconType="pencil"
                  onClick={() => setPopoverVisibility(!isPopoverVisible)}
                />
              }
              isOpen={isPopoverVisible}
              closePopover={() => setPopoverVisibility(false)}
            >
              <PopoverForm
                defaultInterval={item.interval}
                intervalType={item.agg}
                onChange={updateInterval}
              />
            </EuiPopover>
          </EuiFlexItem>
        </Fragment>
      )}
      <EuiFlexItem grow={false} className="mlGroupByLabel--button">
        <EuiButtonIcon
          aria-label={i18n.translate('xpack.ml.dataframe.groupByLabelForm.deleteItemAriaLabel', {
            defaultMessage: 'Delete item',
          })}
          size="s"
          iconType="cross"
          onClick={() => deleteHandler(optionsDataId)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
