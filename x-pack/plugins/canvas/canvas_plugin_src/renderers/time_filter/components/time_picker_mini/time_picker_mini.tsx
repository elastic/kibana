/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { MouseEvent, ReactElement, SFC } from 'react';
import { Popover } from '../../../../../public/components/popover';
import { PrettyDuration } from '../pretty_duration';
import { Props, TimePicker } from '../time_picker';

export const TimePickerMini: SFC<Props> = ({ from, to, onSelect }) => {
  const button = (
    handleClick: (event: MouseEvent<HTMLButtonElement>) => void
  ): ReactElement<any> => (
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
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};
