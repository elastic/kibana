/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './space_result_details.scss';
import React, { Fragment } from 'react';
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
  destinationMap: Map<string, string>;
  onDestinationMapChange: (value?: Map<string, string>) => void;
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

export const SpaceCopyResultDetails = (props: Props) => {
  const { destinationMap, onDestinationMapChange, summarizedCopyResult } = props;
  const { objects } = summarizedCopyResult;

  return (
    <div className="spcCopyToSpaceResultDetails">
      {objects.map((object, index) => {
        const { type, id, name, icon, conflict } = object;
        const pendingObjectRetry = props.retries.find((r) => r.type === type && r.id === id);
        const isOverwritePending = Boolean(pendingObjectRetry?.overwrite);
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
              if (isAmbiguousConflictError(error)) {
                // reset the selection to the first entry
                const value = error.destinations[0].id;
                onDestinationMapChange(new Map(destinationMap.set(`${type}:${id}`, value)));
              }
            } else {
              const destinationId = isAmbiguousConflictError(error)
                ? destinationMap.get(`${type}:${id}`)
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
            onDestinationMapChange(new Map(destinationMap.set(`${type}:${id}`, value)));
            const filtered = props.retries.filter((r) => r.type !== type || r.id !== id);
            const retry = { type, id, overwrite: true, destinationId: value };
            props.onRetriesChange([...filtered, retry]);
          },
        };
        const selectContainerClass =
          selectProps.options.length > 0 && isOverwritePending
            ? ' spcCopyToSpaceResultDetails__selectControl-isOpen'
            : '';

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
                    checked={isOverwritePending}
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
                    pendingObjectRetry={pendingObjectRetry}
                    conflictResolutionInProgress={
                      props.conflictResolutionInProgress && isOverwritePending
                    }
                  />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div className={'spcCopyToSpaceResultDetails__selectControl' + selectContainerClass}>
              <div className="spcCopyToSpaceResultDetails__selectControl__childWrapper">
                <EuiSuperSelect
                  options={selectProps.options}
                  valueOfSelected={destinationMap.get(`${type}:${id}`)}
                  onChange={selectProps.onChange}
                  prepend={i18n.translate(
                    'xpack.spaces.management.copyToSpace.copyDetail.selectControlLabel',
                    { defaultMessage: 'Object ID' }
                  )}
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
