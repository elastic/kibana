/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';

/** prevents links to the new pages from accessing `window.opener` */
const REL_NOOPENER = 'noopener';

/** prevents search engine manipulation by noting the linked document is not trusted or endorsed by us */
const REL_NOFOLLOW = 'nofollow';

/** prevents the browser from sending the current address as referrer via the Referer HTTP header */
const REL_NOREFERRER = 'noreferrer';

/** A hyperlink to a (presumed to be external) news site */
export const NewsLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <EuiLink href={href} rel={`${REL_NOOPENER} ${REL_NOFOLLOW} ${REL_NOREFERRER}`} target="_blank">
    {children}
  </EuiLink>
);
