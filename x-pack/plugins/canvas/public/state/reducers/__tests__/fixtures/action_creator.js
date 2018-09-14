export const actionCreator = type => {
  return (payload, error = null, meta = null) => ({ type, payload, error, meta });
};
