/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type Callback = (isVisible: boolean) => void;

export class Delayed {
  public isVisible = false;
  public timeoutId?: number;
  public displayedAt = 0;
  public enqueuedAt = 0;
  public minimumVisibleDuration: number;
  public hideDelayMs: number;
  public showDelayMs: number;

  constructor({
    minimumVisibleDuration = 1000,
    showDelayMs = 50,
    hideDelayMs = 50
  } = {}) {
    this.minimumVisibleDuration = minimumVisibleDuration;
    this.hideDelayMs = hideDelayMs;
    this.showDelayMs = showDelayMs;
  }

  public onChangeCallback: Callback = () => null;

  public show() {
    this.updateState(true);
  }

  public updateState(isVisible: boolean) {
    window.clearTimeout(this.timeoutId);
    const ms = !isVisible
      ? Math.max(
          this.displayedAt + this.minimumVisibleDuration - Date.now(),
          this.hideDelayMs
        )
      : this.showDelayMs;

    this.timeoutId = window.setTimeout(() => {
      if (this.isVisible !== isVisible) {
        this.isVisible = isVisible;
        this.onChangeCallback(isVisible);
        if (isVisible) {
          this.displayedAt = Date.now();
        }
      }
    }, ms);
  }

  public hide() {
    this.updateState(false);
  }

  public onChange(onChangeCallback: Callback) {
    this.onChangeCallback = onChangeCallback;
  }
}
