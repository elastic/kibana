/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPanel } from '@elastic/eui';

export interface Props {
  isTimesliderOpen: boolean;
  openTimeslider: () => void;
  closeTimeslider: () => void;
}

export function TimesliderToggleButton(props: Props) {
  function onClick() {
    if (props.isTimesliderOpen) {
      props.closeTimeslider();
    } else {
      props.openTimeslider();
    }
  }

  const label = props.isTimesliderOpen
    ? i18n.translate('xpack.maps.timesliderToggleButton.closeLabel', {
        defaultMessage: 'Close timeslider',
      })
    : i18n.translate('xpack.maps.timesliderToggleButton.openLabel', {
        defaultMessage: 'Open timeslider',
      });

  return (
    <EuiPanel paddingSize="none" className="mapToolbarOverlay__button">
      <EuiButtonIcon
        className={classNames({
          'mapToolbarOverlay__buttonIcon-empty': !props.isTimesliderOpen,
        })}
        size="s"
        onClick={onClick}
        data-test-subj="timesliderToggleButton"
        iconType="timeslider"
        aria-label={label}
        title={label}
        isSelected={props.isTimesliderOpen}
        display={props.isTimesliderOpen ? 'fill' : 'empty'}
      />
    </EuiPanel>
  );
}
