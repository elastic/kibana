/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiText,
  EuiTitle,
  EuiAccordion,
  EuiTextColor,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';

import type { SyncSavedObjectResponse, SyncResult } from '../../../../common/types/saved_objects';

export const SyncList: FC<{ syncItems: SyncSavedObjectResponse | null }> = ({ syncItems }) => {
  if (syncItems === null) {
    return null;
  }

  return (
    <>
      <SavedObjectsCreated syncItems={syncItems} />

      <EuiHorizontalRule margin="l" />

      <SavedObjectsDeleted syncItems={syncItems} />

      <EuiHorizontalRule margin="l" />

      <DatafeedsAdded syncItems={syncItems} />

      <EuiHorizontalRule margin="l" />

      <DatafeedsRemoved syncItems={syncItems} />

      <EuiHorizontalRule margin="l" />
    </>
  );
};

const SavedObjectsCreated: FC<{ syncItems: SyncSavedObjectResponse }> = ({ syncItems }) => {
  const count = getTotalItemsCount(syncItems.savedObjectsCreated);

  const title = (
    <>
      <EuiTitle size="xs" data-test-subj="mlJobMgmtSyncFlyoutMissingObjectsTitle">
        <h3>
          <EuiTextColor color={count ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.savedObjectsCreated.title"
              defaultMessage="Missing saved objects ({count})"
              values={{ count }}
            />
          </EuiTextColor>
        </h3>
      </EuiTitle>
      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.savedObjectsCreated.description"
              defaultMessage="If there are jobs that do not have accompanying saved objects, they will be created in the current space."
            />
          </EuiTextColor>
        </p>
      </EuiText>
    </>
  );
  return (
    <SyncItem id="savedObjectsCreated" title={title} results={syncItems.savedObjectsCreated} />
  );
};

const SavedObjectsDeleted: FC<{ syncItems: SyncSavedObjectResponse }> = ({ syncItems }) => {
  const count = getTotalItemsCount(syncItems.savedObjectsDeleted);

  const title = (
    <>
      <EuiTitle size="xs" data-test-subj="mlJobMgmtSyncFlyoutUnmatchedObjectsTitle">
        <h3>
          <EuiTextColor color={count ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.savedObjectsDeleted.title"
              defaultMessage="Unmatched saved objects ({count})"
              values={{ count }}
            />
          </EuiTextColor>
        </h3>
      </EuiTitle>
      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.savedObjectsDeleted.description"
              defaultMessage="If there are saved objects that do not have an accompanying job, they will be deleted."
            />
          </EuiTextColor>
        </p>
      </EuiText>
    </>
  );
  return (
    <SyncItem id="savedObjectsDeleted" title={title} results={syncItems.savedObjectsDeleted} />
  );
};

const DatafeedsAdded: FC<{ syncItems: SyncSavedObjectResponse }> = ({ syncItems }) => {
  const count = getTotalItemsCount(syncItems.datafeedsAdded);

  const title = (
    <>
      <EuiTitle size="xs" data-test-subj="mlJobMgmtSyncFlyoutObjectsMissingDatafeedTitle">
        <h3>
          <EuiTextColor color={count ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.datafeedsAdded.title"
              defaultMessage="Saved objects with missing datafeeds ({count})"
              values={{ count }}
            />
          </EuiTextColor>
        </h3>
      </EuiTitle>
      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.datafeedsAdded.description"
              defaultMessage="If there are saved objects that are missing the datafeed ID for anomaly detection jobs, the ID will be added."
            />
          </EuiTextColor>
        </p>
      </EuiText>
    </>
  );
  return <SyncItem id="datafeedsAdded" title={title} results={syncItems.datafeedsAdded} />;
};

const DatafeedsRemoved: FC<{ syncItems: SyncSavedObjectResponse }> = ({ syncItems }) => {
  const count = getTotalItemsCount(syncItems.datafeedsRemoved);

  const title = (
    <>
      <EuiTitle size="xs" data-test-subj="mlJobMgmtSyncFlyoutObjectsUnmatchedDatafeedTitle">
        <h3>
          <EuiTextColor color={count ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.datafeedsRemoved.title"
              defaultMessage="Saved objects with unmatched datafeed IDs ({count})"
              values={{ count }}
            />
          </EuiTextColor>
        </h3>
      </EuiTitle>
      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.datafeedsRemoved.description"
              defaultMessage="If there are saved objects that use a datafeed that does not exist, they will be deleted."
            />
          </EuiTextColor>
        </p>
      </EuiText>
    </>
  );
  return <SyncItem id="datafeedsRemoved" title={title} results={syncItems.datafeedsRemoved} />;
};

const SyncItem: FC<{ id: string; title: JSX.Element; results: SyncResult }> = ({
  id,
  title,
  results,
}) => {
  return (
    <EuiAccordion id={id} buttonContent={title} paddingSize="l">
      {Object.entries(results).map(([type, items]) => {
        return (
          <Fragment key={type}>
            <EuiText size="s">
              <h4>{type}</h4>
              <ul>
                {Object.keys(items).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </EuiText>
            <EuiSpacer size="s" />
          </Fragment>
        );
      })}
    </EuiAccordion>
  );
};

function getTotalItemsCount(result: SyncResult) {
  return Object.values(result).flatMap((r) => Object.keys(r)).length;
}
