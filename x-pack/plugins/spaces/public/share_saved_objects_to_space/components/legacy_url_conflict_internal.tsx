/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { first } from 'rxjs/operators';

import { FormattedMessage } from '@kbn/i18n/react';
import type { ApplicationStart, StartServicesAccessor } from 'src/core/public';

import type { PluginsStart } from '../../plugin';
import type { LegacyUrlConflictProps } from '../types';
import { DEFAULT_OBJECT_NOUN } from './constants';

export interface InternalProps {
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const LegacyUrlConflictInternal = (props: InternalProps & LegacyUrlConflictProps) => {
  const {
    getStartServices,
    objectNoun = DEFAULT_OBJECT_NOUN,
    currentObjectId,
    otherObjectId,
    otherObjectPath,
  } = props;

  const [applicationStart, setApplicationStart] = useState<ApplicationStart>();
  const [isDismissed, setIsDismissed] = useState(false);
  const [appId, setAppId] = useState<string>();

  useEffect(() => {
    async function setup() {
      const [{ application }] = await getStartServices();
      const appIdValue = await application.currentAppId$.pipe(first()).toPromise(); // retrieve the most recent value from the BehaviorSubject
      setApplicationStart(application);
      setAppId(appIdValue);
    }
    setup();
  }, [getStartServices]);

  if (!applicationStart || !appId || isDismissed) {
    return null;
  }

  function clickLinkButton() {
    applicationStart!.navigateToApp(appId!, { path: otherObjectPath });
  }

  function clickDismissButton() {
    setIsDismissed(true);
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="help"
      title={
        <FormattedMessage
          id="xpack.spaces.shareToSpace.legacyUrlConflictTitle"
          defaultMessage="2 objects are associated with this URL"
        />
      }
    >
      <FormattedMessage
        id="xpack.spaces.shareToSpace.legacyUrlConflictBody"
        defaultMessage="You're currently looking at {objectNoun} [id={currentObjectId}]. A legacy URL for this page shows a different {objectNoun} [id={otherObjectId}]."
        values={{ objectNoun, currentObjectId, otherObjectId }}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="warning"
            size="s"
            onClick={clickLinkButton}
            data-test-subj="legacy-url-conflict-go-to-other-button"
          >
            <FormattedMessage
              id="xpack.spaces.shareToSpace.legacyUrlConflictLinkButton"
              defaultMessage="Go to other {objectNoun}"
              values={{ objectNoun }}
            />
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="warning"
            size="s"
            onClick={clickDismissButton}
            data-test-subj="legacy-url-conflict-dismiss-button"
          >
            <FormattedMessage
              id="xpack.spaces.shareToSpace.legacyUrlConflictDismissButton"
              defaultMessage="Dismiss"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
