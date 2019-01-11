/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Popover } from '../../../../../public/components/popover';
import { PrettyDuration } from '../pretty_duration';
import { TimePicker } from '../time_picker';
import './time_picker_mini.scss';

export const TimePickerMini = ({ from, to, onSelect }) => {
  const button = handleClick => (
    <button className="canvasTimePickerMini__button" onClick={handleClick}>
      <PrettyDuration from={from} to={to} />
    </button>
  );

  return (
    <Popover
      id="timefilter-popover-trigger-click"
      className="canvasTimePickerMini"
      anchorClassName="canvasTimePickerMini__anchor"
      button={button}
    >
      {() => <TimePicker from={from} to={to} onSelect={onSelect} />}
    </Popover>
  );
};

TimePickerMini.propTypes = {
  from: PropTypes.string,
  to: PropTypes.string,
  onSelect: PropTypes.func,
};
