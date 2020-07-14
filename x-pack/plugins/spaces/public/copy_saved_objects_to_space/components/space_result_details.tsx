/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './space_result_details.scss';
import React, { Fragment, useState } from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSwitchEvent,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
} from 'kibana/public';
import { EuiSuperSelect } from '@elastic/eui';
import moment from 'moment';
import { SummarizedCopyToSpaceResult } from '../index';
import { SavedObjectsManagementRecord } from '../../../../../../src/plugins/saved_objects_management/public';
import { Space } from '../../../common/model/space';
import { CopyStatusIndicator } from './copy_status_indicator';
import { ImportRetry } from '../types';

interface Props {
  savedObject: SavedObjectsManagementRecord;
  summarizedCopyResult: SummarizedCopyToSpaceResult;
  space: Space;
  retries: ImportRetry[];
  onRetriesChange: (retries: ImportRetry[]) => void;
  conflictResolutionInProgress: boolean;
}

function getSavedObjectLabel(type: string) {
  switch (type) {
    case 'index-pattern':
    case 'index-patterns':
    case 'indexPatterns':
      return 'index patterns';
    default:
      return type;
  }
}

const isAmbiguousConflictError = (
  error: SavedObjectsImportConflictError | SavedObjectsImportAmbiguousConflictError
): error is SavedObjectsImportAmbiguousConflictError => error.type === 'ambiguous_conflict';

const getInitialSelectValue = (objects: SummarizedCopyToSpaceResult['objects']) =>
  objects.reduce((acc, { type, id, conflict }) => {
    if (conflict && isAmbiguousConflictError(conflict.error)) {
      acc.set(`${type}:${id}`, conflict.error.destinations[0].id);
    }
    return acc;
  }, new Map<string, string>());

export const SpaceCopyResultDetails = (props: Props) => {
  const { objects } = props.summarizedCopyResult;
  const [selectValue, setSelectValue] = useState(getInitialSelectValue(objects));

  return (
    <div className="spcCopyToSpaceResultDetails">
      {objects.map((object, index) => {
        const { type, id, name, icon, conflict } = object;
        const objectOverwritePending = Boolean(
          props.retries.find((r) => r.type === type && r.id === id)?.overwrite
        );
        const switchProps = {
          show: conflict && !props.conflictResolutionInProgress,
          label: i18n.translate('xpack.spaces.management.copyToSpace.copyDetail.overwriteSwitch', {
            defaultMessage: 'Overwrite?',
          }),
          onChange: ({ target: { checked } }: EuiSwitchEvent) => {
            const filtered = props.retries.filter((r) => r.type !== type || r.id !== id);
            const { error } = conflict!;

            if (!checked) {
              props.onRetriesChange(filtered);
            } else {
              const destinationId = isAmbiguousConflictError(error)
                ? selectValue.get(`${type}:${id}`)
                : error.destinationId;
              const retry = { type, id, overwrite: true, ...(destinationId && { destinationId }) };
              props.onRetriesChange([...filtered, retry]);
            }
          },
        };
        const selectProps = {
          options:
            conflict?.error && isAmbiguousConflictError(conflict.error)
              ? conflict.error.destinations.map((destination) => {
                  const header = destination.title ?? `${type} [id=${destination.id}]`;
                  const lastUpdated = destination.updatedAt
                    ? moment(destination.updatedAt).fromNow()
                    : 'never';
                  return {
                    value: destination.id,
                    inputDisplay: destination.id,
                    dropdownDisplay: (
                      <Fragment>
                        <strong>{header}</strong>
                        <EuiText size="s" color="subdued">
                          <p className="euiTextColor--subdued">
                            ID: {destination.id}
                            <br />
                            Last updated: {lastUpdated}
                          </p>
                        </EuiText>
                      </Fragment>
                    ),
                  };
                })
              : [],
          onChange: (value: string) => {
            setSelectValue(new Map(selectValue.set(`${type}:${id}`, value)));
            const filtered = props.retries.filter((r) => r.type !== type || r.id !== id);
            const retry = { type, id, overwrite: true, destinationId: value };
            props.onRetriesChange([...filtered, retry]);
          },
        };
        const selectContainerClass =
          selectProps.options.length > 0 && objectOverwritePending ? '' : ' euiAccordion-isClosed';

        return (
          <Fragment key={index}>
            <EuiFlexGroup
              responsive={false}
              key={index}
              alignItems="center"
              gutterSize="s"
              className="spcCopyToSpaceResultDetails__row"
            >
              <EuiFlexItem grow={false}>
                <EuiToolTip position="top" content={getSavedObjectLabel(type)}>
                  <EuiIcon aria-label={getSavedObjectLabel(type)} type={icon} size="s" />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={5} className="spcCopyToSpaceResultDetails__savedObjectName">
                <EuiText size="s">
                  <p className="eui-textTruncate" title={name}>
                    {name}
                  </p>
                </EuiText>
              </EuiFlexItem>
              {switchProps.show && (
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    label={switchProps.label}
                    compressed={true}
                    checked={objectOverwritePending}
                    onChange={switchProps.onChange}
                    data-test-subj={`cts-overwrite-conflict-${type}:${id}`}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem className="spcCopyToSpaceResultDetails__statusIndicator" grow={false}>
                <div className="eui-textRight">
                  <CopyStatusIndicator
                    summarizedCopyResult={props.summarizedCopyResult}
                    object={object}
                    overwritePending={objectOverwritePending}
                    conflictResolutionInProgress={
                      props.conflictResolutionInProgress && objectOverwritePending
                    }
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div className={'spcCopyToSpaceResultDetails__selectControl' + selectContainerClass}>
              <div className="euiAccordion__childWrapper">
                <EuiSuperSelect
                  options={selectProps.options}
                  valueOfSelected={selectValue.get(`${type}:${id}`)}
                  onChange={selectProps.onChange}
                  append="Object ID"
                  hasDividers
                  fullWidth
                  compressed
                />
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};
