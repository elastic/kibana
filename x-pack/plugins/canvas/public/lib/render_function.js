export function RenderFunction(config) {
  // This must match the name of the function that is used to create the `type: render` object
  this.name = config.name;

  // Use this to set a more friendly name
  this.displayName = config.displayName || this.name;

  // A sentence or few about what this element does
  this.help = config.help;

  // used to validate the data before calling the render function
  this.validate = config.validate || function validate() {};

  // tell the renderer if the dom node should be reused, it's recreated each time by default
  this.reuseDomNode = Boolean(config.reuseDomNode);

  // the function called to render the data
  this.render =
    config.render ||
    function render(domNode, data, done) {
      done();
    };
}
