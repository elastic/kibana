/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiFieldNumber,
  EuiPopoverTitle,
  EuiSelect,
  EuiCallOut,
  EuiExpression,
  EuiTextColor,
} from '@elastic/eui';
import { flatten } from 'lodash';
import { Craft, Operator } from '../../common/constants';

interface GeoThresholdParamsProps {
  alertParams: {
    entity: string;
    index: string;
    dateField: string;
    shapesArr: unknown[];
    type: string;
  };
  setAlertParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
}

export const GeoThresholdExpression: React.FunctionComponent<GeoThresholdParamsProps> = ({
  alertParams,
  setAlertParams,
  errors,
}) => {
  const { entity = '', index = '', dateField = '', shapesArr = [], type = '' } = alertParams;

  // store defaults
  useEffect(() => {
    if (entity !== alertParams.entity) {
      setAlertParams('entity', entity);
    }
    if (index !== alertParams.index) {
      setAlertParams('index', index);
    }
    if (dateField !== alertParams.dateField) {
      setAlertParams('dateField', dateField);
    }
    if (_.isEqual(shapesArr, alertParams.shapesArr)) {
      setAlertParams('index', index);
    }
    if (type !== alertParams.type) {
      setAlertParams('type', type);
    }
  }, [alertParams, entity, index, dateField, type, setAlertParams, shapesArr]);

  const [craftTrigger, setCraftTrigger] = useState<{ craft: string; isOpen: boolean }>({
    craft,
    isOpen: false,
  });
  const [outerSpaceCapacityTrigger, setOuterSpaceCapacity] = useState<{
    outerSpaceCapacity: number;
    op: string;
    isOpen: boolean;
  }>({
    outerSpaceCapacity,
    op,
    isOpen: false,
  });

  const errorsCallout = flatten(
    Object.entries(errors).map(([field, errs]: [string, string[]]) =>
      errs.map((e) => (
        <p>
          <EuiTextColor color="accent">{field}:</EuiTextColor>`: ${errs}`
        </p>
      ))
    )
  );

  return (
    <Fragment>
      {errorsCallout.length ? (
        <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
          {errorsCallout}
        </EuiCallOut>
      ) : (
        <Fragment />
      )}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="craft"
            button={
              <EuiExpression
                description="When the People in"
                value={craftTrigger.craft}
                isActive={craftTrigger.isOpen}
                onClick={() => {
                  setCraftTrigger({
                    ...craftTrigger,
                    isOpen: true,
                  });
                }}
              />
            }
            isOpen={craftTrigger.isOpen}
            closePopover={() => {
              setCraftTrigger({
                ...craftTrigger,
                isOpen: false,
              });
            }}
            ownFocus
            panelPaddingSize="s"
            anchorPosition="downLeft"
          >
            <div style={{ zIndex: 200 }}>
              <EuiPopoverTitle>When the People in</EuiPopoverTitle>
              <EuiSelect
                compressed
                value={craftTrigger.craft}
                onChange={(event) => {
                  setAlertParams('craft', event.target.value);
                  setCraftTrigger({
                    craft: event.target.value,
                    isOpen: false,
                  });
                }}
                options={[
                  { value: Craft.OuterSpace, text: 'Outer Space' },
                  { value: Craft.ISS, text: 'the International Space Station' },
                ]}
              />
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
