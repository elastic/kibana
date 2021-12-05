/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiText, EuiTitle, EuiAccordion, EuiTextColor, EuiHorizontalRule } from '@elastic/eui';

import { SyncSavedObjectResponse } from '../../../../common/types/saved_objects';

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
  const items = Object.keys(syncItems.savedObjectsCreated);

  const title = (
    <>
      <EuiTitle size="xs" data-test-subj="mlJobMgmtSyncFlyoutMissingObjectsTitle">
        <h3>
          <EuiTextColor color={items.length ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.savedObjectsCreated.title"
              defaultMessage="Missing saved objects ({count})"
              values={{ count: items.length }}
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
  return <SyncItem id="savedObjectsCreated" title={title} items={items} />;
};

const SavedObjectsDeleted: FC<{ syncItems: SyncSavedObjectResponse }> = ({ syncItems }) => {
  const items = Object.keys(syncItems.savedObjectsDeleted);

  const title = (
    <>
      <EuiTitle size="xs" data-test-subj="mlJobMgmtSyncFlyoutUnmatchedObjectsTitle">
        <h3>
          <EuiTextColor color={items.length ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.savedObjectsDeleted.title"
              defaultMessage="Unmatched saved objects ({count})"
              values={{ count: items.length }}
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
  return <SyncItem id="savedObjectsDeleted" title={title} items={items} />;
};

const DatafeedsAdded: FC<{ syncItems: SyncSavedObjectResponse }> = ({ syncItems }) => {
  const items = Object.keys(syncItems.datafeedsAdded);

  const title = (
    <>
      <EuiTitle size="xs" data-test-subj="mlJobMgmtSyncFlyoutObjectsMissingDatafeedTitle">
        <h3>
          <EuiTextColor color={items.length ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.datafeedsAdded.title"
              defaultMessage="Saved objects with missing datafeeds ({count})"
              values={{ count: items.length }}
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
  return <SyncItem id="datafeedsAdded" title={title} items={items} />;
};

const DatafeedsRemoved: FC<{ syncItems: SyncSavedObjectResponse }> = ({ syncItems }) => {
  const items = Object.keys(syncItems.datafeedsRemoved);

  const title = (
    <>
      <EuiTitle size="xs" data-test-subj="mlJobMgmtSyncFlyoutObjectsUnmatchedDatafeedTitle">
        <h3>
          <EuiTextColor color={items.length ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.syncSavedObjectsFlyout.datafeedsRemoved.title"
              defaultMessage="Saved objects with unmatched datafeed IDs ({count})"
              values={{ count: items.length }}
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
  return <SyncItem id="datafeedsRemoved" title={title} items={items} />;
};

const SyncItem: FC<{ id: string; title: JSX.Element; items: string[] }> = ({
  id,
  title,
  items,
}) => (
  <EuiAccordion id={id} buttonContent={title} paddingSize="l">
    <EuiText size="s">
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </EuiText>
  </EuiAccordion>
);
