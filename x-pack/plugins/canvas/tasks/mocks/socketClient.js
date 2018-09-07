const noop = () => {};

// arguments: url, options
// https://github.com/socketio/socket.io-client/blob/master/docs/API.md#iourl-options
export default function mockIo() {
  return {
    on: noop,
    emit: noop,
    once: noop,
  };
}
