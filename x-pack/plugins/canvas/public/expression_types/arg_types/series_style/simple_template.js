/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiButtonIcon } from '@elastic/eui';
import { set, del } from 'object-path-immutable';
import { get } from 'lodash';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { ColorPickerMini } from '../../../components/color_picker_mini';
import { TooltipIcon } from '../../../components/tooltip_icon';

const SimpleTemplateUI = ({ intl, ...props }) => {
  const { typeInstance, argValue, onValueChange, labels, workpad } = props;
  const { name } = typeInstance;
  const chain = get(argValue, 'chain.0', {});
  const chainArgs = get(chain, 'arguments', {});
  const color = get(chainArgs, 'color.0', '');

  const handleChange = (argName, ev) => {
    const fn = ev.target.value === '' ? del : set;

    const newValue = fn(argValue, ['chain', 0, 'arguments', argName], [ev.target.value]);
    return onValueChange(newValue);
  };

  const handlePlain = (argName, val) => handleChange(argName, { target: { value: val } });

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" className="canvasArgSeries__colorPicker">
      {!color || color.length === 0 ? (
        <Fragment>
          <EuiFlexItem grow={false}>
            <label>
              <FormattedMessage
                id="xpack.canvas.expression.types.style.template.noColorLabel"
                defaultMessage="Color"
              />
              &nbsp;
            </label>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink onClick={() => handlePlain('color', '#000000')}>
              <FormattedMessage
                id="xpack.canvas.expression.types.style.template.autoLinkTitle"
                defaultMessage="Auto"
              />
              <EuiIcon type="bolt" />
            </EuiLink>
          </EuiFlexItem>
        </Fragment>
      ) : (
        <Fragment>
          <EuiFlexItem grow={false}>
            <label>
              <FormattedMessage
                id="xpack.canvas.expression.types.style.template.colorLabel"
                defaultMessage="Color"
              />
              &nbsp;
            </label>
          </EuiFlexItem>
          <EuiFlexItem style={{ fontSize: 0 }}>
            <ColorPickerMini
              id={'series-style'}
              value={color}
              onChange={val => handlePlain('color', val)}
              colors={workpad.colors}
              placement="leftCenter"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonIcon
              iconType="cross"
              color="danger"
              onClick={() => handlePlain('color', '')}
              aria-label={intl.formatMessage({
                id: 'xpack.canvas.expression.types.style.template.removeSeriesColorAriaLabel',
                defaultMessage: 'Remove Series Color',
              })}
            />
          </EuiFlexItem>
        </Fragment>
      )}
      {name !== 'defaultStyle' &&
        (!labels || labels.length === 0) && (
          <EuiFlexItem grow={false}>
            <TooltipIcon
              position="left"
              icon="warning"
              content={
                <FormattedMessage
                  id="xpack.canvas.expression.types.style.template.addColorDimensionDescription"
                  defaultMessage="Data has no series to style, add a color dimension"
                />
              }
            />
          </EuiFlexItem>
        )}
    </EuiFlexGroup>
  );
};

SimpleTemplateUI.displayName = 'SeriesStyleArgSimpleInput';

SimpleTemplateUI.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.any.isRequired,
  labels: PropTypes.array,
  workpad: PropTypes.shape({
    colors: PropTypes.array.isRequired,
  }).isRequired,
  typeInstance: PropTypes.shape({ name: PropTypes.string.isRequired }).isRequired,
};

export const SimpleTemplate = injectI18n(SimpleTemplateUI);
