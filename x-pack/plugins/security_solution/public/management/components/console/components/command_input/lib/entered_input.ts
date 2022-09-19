/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Class that manages the command entered and how that is displayed to the left and right of the cursor
 */
export class EnteredInput {
  constructor(private leftOfCursorText: string, private rightOfCursorText: string) {}

  private replaceSelection(selection: string, newValue: string) {
    const prevFullTextEntered = this.leftOfCursorText + this.rightOfCursorText;

    this.leftOfCursorText =
      prevFullTextEntered.substring(0, prevFullTextEntered.indexOf(selection)) + newValue;

    this.rightOfCursorText = prevFullTextEntered.substring(
      prevFullTextEntered.indexOf(selection) + selection.length
    );
  }

  getLeftOfCursorText(): string {
    return this.leftOfCursorText;
  }

  getRightOfCursorText(): string {
    return this.rightOfCursorText;
  }

  getFullText(): string {
    return this.leftOfCursorText + this.rightOfCursorText;
  }

  moveCursorTo(direction: 'left' | 'right' | 'end' | 'home') {
    switch (direction) {
      case 'end':
        this.leftOfCursorText = this.leftOfCursorText + this.rightOfCursorText;
        this.rightOfCursorText = '';
        break;

      case 'home':
        this.rightOfCursorText = this.leftOfCursorText + this.rightOfCursorText;
        this.leftOfCursorText = '';
        break;

      case 'left':
        if (this.leftOfCursorText.length) {
          // Add last character on the left, to the right side of the cursor
          this.rightOfCursorText =
            this.leftOfCursorText.charAt(this.leftOfCursorText.length - 1) + this.rightOfCursorText;

          // Remove the last character from the left (it's now on the right side of cursor)
          this.leftOfCursorText = this.leftOfCursorText.substring(
            0,
            this.leftOfCursorText.length - 1
          );
        }
        break;

      case 'right':
        if (this.rightOfCursorText.length) {
          // MOve the first character from the Right side, to the left side of the cursor
          this.leftOfCursorText = this.leftOfCursorText + this.rightOfCursorText.charAt(0);

          // Remove the first character from the Right side of the cursor (now on the left)
          this.rightOfCursorText = this.rightOfCursorText.substring(1);
        }
        break;
    }
  }

  addValue(value: string, replaceSelection: string = '') {
    if (replaceSelection.length && value.length) {
      this.replaceSelection(replaceSelection, value);
    } else {
      this.leftOfCursorText += value;
    }
  }

  deleteChar(replaceSelection: string = '') {
    if (replaceSelection) {
      this.replaceSelection(replaceSelection, '');
    } else if (this.rightOfCursorText) {
      this.rightOfCursorText = this.rightOfCursorText.substring(1);
    }
  }

  backspaceChar(replaceSelection: string = '') {
    if (replaceSelection) {
      this.replaceSelection(replaceSelection, '');
    } else if (this.leftOfCursorText) {
      this.leftOfCursorText = this.leftOfCursorText.substring(0, this.leftOfCursorText.length - 1);
    }
  }
}
