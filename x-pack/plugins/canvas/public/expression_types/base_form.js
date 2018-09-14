export class BaseForm {
  constructor(props) {
    if (!props.name) throw new Error('Expression specs require a name property');

    this.name = props.name;
    this.displayName = props.displayName || this.name;
    this.help = props.help || '';
  }
}
