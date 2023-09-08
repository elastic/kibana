/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@elastic/synthetics';

export async function isEuiFormFieldInValid(locator: ReturnType<Page['locator']>) {
  const elementHandle = await locator.elementHandle();
  expect(elementHandle).toBeTruthy();

  const classAttribute = (await elementHandle!.asElement().getAttribute('class')) ?? '';
  const isAriaInvalid = (await elementHandle!.asElement().getAttribute('aria-invalid')) ?? 'false';

  return classAttribute.indexOf('-isInvalid') > -1 || isAriaInvalid === 'true';
}

export async function clearAndType(locator: ReturnType<Page['locator']>, value: string) {
  await locator.fill('');
  await locator.type(value);
}

export async function typeViaKeyboard(locator: ReturnType<Page['locator']>, value: string) {
  await locator.click();
  await locator.page().keyboard.type(value);
}

export async function blur(locator: ReturnType<Page['locator']>) {
  await locator.evaluate((e) => {
    e.blur();
  });
}

export async function clickAndBlur(locator: ReturnType<Page['locator']>) {
  await locator.click();
  await blur(locator);
}

export async function assertShouldNotExist(locator: ReturnType<Page['locator']>) {
  await locator.waitFor({ state: 'detached' });
}
