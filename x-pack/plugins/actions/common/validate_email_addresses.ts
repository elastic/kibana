/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAddressList } from 'email-addresses';
import { ValidatedEmail, InvalidEmailReason } from './types';
import { hasMustacheTemplate } from './mustache_template';

/** Options that can be used when validating email addresses */
export interface ValidateEmailAddressesOptions {
  /** treat any address which contains a mustache template as valid */
  treatMustacheTemplatesAsValid?: boolean;
}

// this can be useful for cases where a plugin needs this function,
// but the actions plugin may not be available.  This could be used
// as a stub for the real implementation.
export function validateEmailAddressesAsAlwaysValid(addresses: string[]): ValidatedEmail[] {
  return addresses.map((address) => ({ address, valid: true }));
}

export function validateEmailAddresses(
  allowedDomains: string[] | null,
  addresses: string[],
  options: ValidateEmailAddressesOptions = {}
): ValidatedEmail[] {
  return addresses.map((address) => validateEmailAddress(allowedDomains, address, options));
}

export function invalidEmailsAsMessage(validatedEmails: ValidatedEmail[]): string | undefined {
  const invalid = validatedEmails.filter(
    (validated) => !validated.valid && validated.reason === InvalidEmailReason.invalid
  );
  const notAllowed = validatedEmails.filter(
    (validated) => !validated.valid && validated.reason === InvalidEmailReason.notAllowed
  );

  const messages: string[] = [];
  if (invalid.length !== 0) {
    messages.push(`not valid emails: ${addressesFromValidatedEmails(invalid).join(', ')}`);
  }
  if (notAllowed.length !== 0) {
    messages.push(`not allowed emails: ${addressesFromValidatedEmails(notAllowed).join(', ')}`);
  }

  if (messages.length === 0) return;

  return messages.join('; ');
}

// in case the npm email-addresses returns unexpected things ...
function validateEmailAddress(
  allowedDomains: string[] | null,
  address: string,
  options: ValidateEmailAddressesOptions
): ValidatedEmail {
  // The reason we bypass the validation in this case, is that email addresses
  // used in an alerting action could contain mustache templates which render
  // as the actual values. So we can't really validate them.  Fear not!
  // We always do a final validation in the executor where we do NOT
  // have this flag on.
  if (options.treatMustacheTemplatesAsValid && hasMustacheTemplate(address)) {
    return { address, valid: true };
  }

  try {
    return validateEmailAddress_(allowedDomains, address);
  } catch (err) {
    return { address, valid: false, reason: InvalidEmailReason.invalid };
  }
}

function validateEmailAddress_(allowedDomains: string[] | null, address: string): ValidatedEmail {
  const emailAddresses = parseAddressList(address);
  if (emailAddresses == null) {
    return { address, valid: false, reason: InvalidEmailReason.invalid };
  }

  if (allowedDomains !== null) {
    const allowedDomainsSet = new Set(allowedDomains);

    for (const emailAddress of emailAddresses) {
      let domains: string[] = [];

      if (emailAddress.type === 'group') {
        domains = emailAddress.addresses.map((groupAddress) => groupAddress.domain);
      } else if (emailAddress.type === 'mailbox') {
        domains = [emailAddress.domain];
      } else {
        return { address, valid: false, reason: InvalidEmailReason.invalid };
      }

      for (const domain of domains) {
        if (!allowedDomainsSet.has(domain)) {
          return { address, valid: false, reason: InvalidEmailReason.notAllowed };
        }
      }
    }
  }
  return { address, valid: true };
}

function addressesFromValidatedEmails(validatedEmails: ValidatedEmail[]) {
  return validatedEmails.map((validatedEmail) => validatedEmail.address);
}
