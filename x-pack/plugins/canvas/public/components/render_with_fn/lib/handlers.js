export class ElementHandlers {
  resize() {}

  destroy() {}

  onResize(fn) {
    this.resize = fn;
  }

  onDestroy(fn) {
    this.destroy = fn;
  }
}
