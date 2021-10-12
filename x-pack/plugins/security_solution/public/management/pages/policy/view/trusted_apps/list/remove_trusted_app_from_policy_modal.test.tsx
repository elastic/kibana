/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('When using the RemoveTrustedAppFromPolicyModal component', () => {
  it.todo.each([
    ['cancel', ''],
    ['X', ''],
  ])('should close modal when %s button is clicked');

  it.todo('should dispatch action when confirmed');

  it.todo('should should show loading state on confirm button while update is underway');

  it.todo.each([
    ['cancel', ''],
    ['X', ''],
  ])('should prevent dialog dismissal while update is underway');

  it.todo('should show error toast if removal failed');

  it.todo('should show success toast and close modal when removed is successful');

  it.todo('should show single removal success message');

  it.todo('should show multiples removal success message');
});
