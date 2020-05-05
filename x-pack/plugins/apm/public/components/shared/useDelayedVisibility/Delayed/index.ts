/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type Callback = (isVisible: boolean) => void;

export class Delayed {
  private displayedAt = 0;
  private hideDelayMs: number;
  private isVisible = false;
  private minimumVisibleDuration: number;
  private showDelayMs: number;
  private timeoutId?: number;

  constructor({
    minimumVisibleDuration = 1000,
    showDelayMs = 50,
    hideDelayMs = 50
  } = {}) {
    this.minimumVisibleDuration = minimumVisibleDuration;
    this.hideDelayMs = hideDelayMs;
    this.showDelayMs = showDelayMs;
  }

  private onChangeCallback: Callback = () => null;

  private updateState(isVisible: boolean) {
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

  public show() {
    this.updateState(true);
  }

  public hide() {
    this.updateState(false);
  }

  public onChange(onChangeCallback: Callback) {
    this.onChangeCallback = onChangeCallback;
  }

  public destroy() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
    }
  }
}
