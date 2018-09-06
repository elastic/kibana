import enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

// this will run before any code that's inside a describe block
// so we can use it to set up whatever we need for our browser tests
before(() => {
  // configure enzume
  enzyme.configure({ adapter: new Adapter() });
});
