/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeNavLink, ChromeNavLinks } from 'kibana/public';
import { GraphLicenseInformation } from '../../common/check_license';

type Mutable<T> = { -readonly [P in keyof T]: T[P] };
type ChromeNavLinkUpdate = Mutable<Partial<ChromeNavLink>>;

export function toggleNavLink(
  licenseInformation: GraphLicenseInformation,
  navLinks: ChromeNavLinks
) {
  const navLinkUpdates: ChromeNavLinkUpdate = {
    hidden: !licenseInformation.showAppLink,
  };
  if (licenseInformation.showAppLink) {
    navLinkUpdates.disabled = !licenseInformation.enableAppLink;
    navLinkUpdates.tooltip = licenseInformation.message;
  }

  navLinks.update('graph', navLinkUpdates);
}
