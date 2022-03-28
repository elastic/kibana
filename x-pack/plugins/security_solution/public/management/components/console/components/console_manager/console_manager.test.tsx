/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('When using ConsoleManager', () => {
  it.todo('should return the expected interface');

  it.todo('should register a console');

  it.todo('should show a console by `id`');

  it.todo('should throw if attempting to show a console with invalid `id`');

  it.todo("should persist a console's command output history");

  it.todo('should hide a console by `id`');

  it.todo('should throw if attempting to hide a console with invalid `id`');

  it.todo('should terminate a console by `id`');

  it.todo('should call `onBeforeTerminate()`');

  it.todo('should throw if attempting to terminate a console with invalid `id`');

  it.todo('should return a registered console when calling `getOne()`');

  it.todo('should return `undefined` when calling getOne() with invalid `id`');

  it.todo('should return list of registered consoles when calling `getList()`');

  describe('and using the Registered Console client interface', () => {
    it.todo('should have the expected interface');

    it.todo('should display the console when `.show()` is called');

    it.todo('should hide the console when `.hide()` is called');

    it.todo('should un-register the console when `.terminate() is called');
  });

  describe('and when the console popup is opened', () => {
    it.todo('should show the title');

    it.todo('should show the console');

    it.todo('should show `terminate` button');

    it.todo('should show `hide` button');

    it.todo('should hide the popup');

    it.todo('should show confirmation when terminate button is clicked');

    describe('and the terminate confirmation is shown', () => {
      it.todo('should show message confirmation');

      it.todo('should show cancel and terminate buttons');

      it.todo('should hide the confirmation when cancel is clicked');

      it.todo('should terminate when terminate is clicked');
    });
  });
});
