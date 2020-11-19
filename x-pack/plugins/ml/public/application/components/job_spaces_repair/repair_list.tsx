/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiText, EuiTitle, EuiAccordion, EuiTextColor, EuiHorizontalRule } from '@elastic/eui';

import { RepairSavedObjectResponse } from '../../../../common/types/saved_objects';

export const RepairList: FC<{ repairItems: RepairSavedObjectResponse | null }> = ({
  repairItems,
}) => {
  if (repairItems === null) {
    return null;
  }

  return (
    <>
      <SavedObjectsCreated repairItems={repairItems} />

      <EuiHorizontalRule margin="l" />

      <SavedObjectsDeleted repairItems={repairItems} />

      <EuiHorizontalRule margin="l" />

      <DatafeedsAdded repairItems={repairItems} />

      <EuiHorizontalRule margin="l" />

      <DatafeedsRemoved repairItems={repairItems} />

      <EuiHorizontalRule margin="l" />
    </>
  );
};

const SavedObjectsCreated: FC<{ repairItems: RepairSavedObjectResponse }> = ({ repairItems }) => {
  const items = Object.keys(repairItems.savedObjectsCreated);

  const title = (
    <>
      <EuiTitle size="xs">
        <h3>
          <EuiTextColor color={items.length ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.repairSavedObjectsFlyout.savedObjectsCreated.title"
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
              id="xpack.ml.management.repairSavedObjectsFlyout.savedObjectsCreated.description"
              defaultMessage="If there are jobs that do not have accompanying saved objects, they will be created in the current space."
            />
          </EuiTextColor>
        </p>
      </EuiText>
    </>
  );
  return <RepairItem id="savedObjectsCreated" title={title} items={items} />;
};

const SavedObjectsDeleted: FC<{ repairItems: RepairSavedObjectResponse }> = ({ repairItems }) => {
  const items = Object.keys(repairItems.savedObjectsDeleted);

  const title = (
    <>
      <EuiTitle size="xs">
        <h3>
          <EuiTextColor color={items.length ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.repairSavedObjectsFlyout.savedObjectsDeleted.title"
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
              id="xpack.ml.management.repairSavedObjectsFlyout.savedObjectsDeleted.description"
              defaultMessage="If there are saved objects that do not have an accompanying job, they will be deleted."
            />
          </EuiTextColor>
        </p>
      </EuiText>
    </>
  );
  return <RepairItem id="savedObjectsDeleted" title={title} items={items} />;
};

const DatafeedsAdded: FC<{ repairItems: RepairSavedObjectResponse }> = ({ repairItems }) => {
  const items = Object.keys(repairItems.datafeedsAdded);

  const title = (
    <>
      <EuiTitle size="xs">
        <h3>
          <EuiTextColor color={items.length ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.repairSavedObjectsFlyout.datafeedsAdded.title"
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
              id="xpack.ml.management.repairSavedObjectsFlyout.datafeedsAdded.description"
              defaultMessage="If there are saved objects that are missing the datafeed ID for anomaly detection jobs, the ID will be added."
            />
          </EuiTextColor>
        </p>
      </EuiText>
    </>
  );
  return <RepairItem id="datafeedsAdded" title={title} items={items} />;
};

const DatafeedsRemoved: FC<{ repairItems: RepairSavedObjectResponse }> = ({ repairItems }) => {
  const items = Object.keys(repairItems.datafeedsRemoved);

  const title = (
    <>
      <EuiTitle size="xs">
        <h3>
          <EuiTextColor color={items.length ? 'default' : 'subdued'}>
            <FormattedMessage
              id="xpack.ml.management.repairSavedObjectsFlyout.datafeedsRemoved.title"
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
              id="xpack.ml.management.repairSavedObjectsFlyout.datafeedsRemoved.description"
              defaultMessage="If there are saved objects that use a datafeed that does not exist, they will be deleted."
            />
          </EuiTextColor>
        </p>
      </EuiText>
    </>
  );
  return <RepairItem id="datafeedsRemoved" title={title} items={items} />;
};

const RepairItem: FC<{ id: string; title: JSX.Element; items: string[] }> = ({
  id,
  title,
  items,
}) => (
  <EuiAccordion id={id} buttonContent={title} paddingSize="l">
    <EuiText size="s">
      {items.length && (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </EuiText>
  </EuiAccordion>
);
